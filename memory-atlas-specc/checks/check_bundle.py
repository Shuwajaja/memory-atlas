#!/usr/bin/env python3
"""Validate this specification bundle, not the future Memory Atlas application.
No dependencies. The schema checker deliberately supports only the JSON Schema
keywords used by this bundle and rejects unknown assertion keywords.
"""
from pathlib import Path
import copy
import hashlib
import json
import re
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]

def fail(message):
    raise AssertionError(message)

def require(condition, message):
    if not condition:
        fail(message)

def sha(value):
    if isinstance(value, str):
        value = value.encode('utf-8')
    return hashlib.sha256(value).hexdigest()

def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))

def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))

SUPPORTED = {'$schema','$id','$ref','$defs','title','description','type','properties',
             'required','additionalProperties','items','const','enum','anyOf','minimum',
             'maximum','minItems','maxItems','minLength','pattern','format'}

def schema_check(value, schema, root, path='$'):
    unknown = set(schema) - SUPPORTED
    require(not unknown, f'{path}: unsupported schema keywords {unknown}')
    if '$ref' in schema:
        pointer = schema['$ref']
        require(pointer.startswith('#/'), 'Only local schema refs supported')
        resolved = root
        for part in pointer[2:].split('/'):
            resolved = resolved[part.replace('~1','/').replace('~0','~')]
        return schema_check(value, resolved, root, path)
    if 'anyOf' in schema:
        for choice in schema['anyOf']:
            try:
                schema_check(value, choice, root, path)
                return
            except AssertionError:
                pass
        fail(f'{path}: no anyOf branch matches')
    if 'const' in schema:
        require(type(value) is type(schema['const']) and value == schema['const'], f'{path}: const mismatch')
    if 'enum' in schema:
        require(value in schema['enum'], f'{path}: enum mismatch')
    typ = schema.get('type')
    typemap = {'object':dict,'array':list,'string':str,'integer':int,'boolean':bool,'null':type(None)}
    if typ:
        require(typ in typemap and type(value) is typemap[typ], f'{path}: type {typ} expected')
    if typ == 'object':
        require(set(schema.get('required',[])) <= set(value), f'{path}: missing required keys')
        props = schema.get('properties',{})
        if schema.get('additionalProperties') is False:
            require(set(value) <= set(props), f'{path}: unknown property {set(value)-set(props)}')
        for key, val in value.items():
            if key in props:
                schema_check(val, props[key], root, path+'.'+key)
    if typ == 'array':
        require(len(value) >= schema.get('minItems',0), f'{path}: too few items')
        require(len(value) <= schema.get('maxItems',float('inf')), f'{path}: too many items')
        for i, val in enumerate(value):
            schema_check(val, schema.get('items',{}), root, f'{path}[{i}]')
    if typ == 'integer':
        require(schema.get('minimum',-float('inf')) <= value <= schema.get('maximum',float('inf')), f'{path}: bounds')
    if typ == 'string':
        require(len(value) >= schema.get('minLength',0), f'{path}: short string')
        if 'pattern' in schema:
            require(re.search(schema['pattern'], value) is not None, f'{path}: pattern mismatch')
        if schema.get('format') == 'date-time':
            try:
                d = datetime.fromisoformat(value.replace('Z','+00:00'))
                require(d.tzinfo is not None and 'T' in value, f'{path}: offset required')
            except ValueError:
                fail(f'{path}: invalid datetime')
        elif 'format' in schema:
            fail(f'{path}: unsupported format')

def must_reject(value, schema, label):
    try:
        schema_check(value, schema, schema)
    except AssertionError:
        return
    fail('Negative schema test did not reject '+label)

def main():
    files = list(ROOT.rglob('*'))
    json_paths = sorted(f for f in files if f.is_file() and f.suffix == '.json')
    for f in json_paths:
        json.loads(f.read_text(encoding='utf-8'))
    print(f'PASS JSON syntax: {len(json_paths)} files')

    snap = read('examples/demo.atlas.json')
    ss = read('schemas/atlas.schema.json')
    mem = read('examples/memory-export.json')
    ms = read('schemas/memory-export.schema.json')
    schema_check(snap, ss, ss)
    schema_check(mem, ms, ms)
    bad = copy.deepcopy(snap); bad['schema_version']='2.0.0'; must_reject(bad,ss,'future version')
    bad = copy.deepcopy(snap); bad['claims'][0]['execution_verified']=True; must_reject(bad,ss,'forged field')
    bad = copy.deepcopy(mem); bad['payload']['context_only']=False; must_reject(bad,ms,'privileged context')
    bad = copy.deepcopy(mem); bad['payload']['entries']=[]; must_reject(bad,ms,'empty export')
    print('PASS schema-contract subset: 2 positive and 4 negative examples')

    sources = {x['id']:x for x in snap['source_files']}
    messages = {x['revision_id']:x for x in snap['messages']}
    nodes = {x['id']:x for x in snap['nodes']}
    claims = {x['id']:x for x in snap['claims']}
    evidence = {x['id']:x for x in snap['evidence']}
    batches = {x['id']:x for x in snap['import_batches']}
    convs = {x['id']:x for x in snap['conversations']}
    for table, key in [('source_files','id'),('messages','revision_id'),('nodes','id'),('claims','id'),('evidence','id'),('reviews','id'),('relations','id')]:
        require(len({x[key] for x in snap[table]}) == len(snap[table]), 'duplicate IDs '+table)
    for s in sources.values():
        require(sha(s['raw_text']) == s['byte_sha256'], 'source byte hash')
        require(s['id']=='src_'+sha(canonical({k:s[k] for k in ['namespace','provider','byte_sha256']})), 'source identity')
    for m in messages.values():
        require(m['conversation_id'] in convs, 'conversation missing')
        require(m['revision_id']=='rev_'+sha(canonical({k:m[k] for k in ['logical_id','role','sent_at','parts']})), 'revision digest')
        require(bool(m['occurrences']), 'message occurrence missing')
        for o in m['occurrences']:
            require(o['source_file_id'] in sources and o['import_batch_id'] in batches, 'source/batch missing')
            require(nodes[o['node_id']]['message_revision_id']==m['revision_id'], 'occurrence node mismatch')
    for n in nodes.values():
        require(n['import_batch_id'] in batches and n['conversation_id'] in convs, 'node parents missing')
        require(n['parent_node_id'] is None or n['parent_node_id'] in nodes, 'demo dangling parent')
        require(all(x in nodes for x in n['child_node_ids']), 'demo dangling children')
    for ev in evidence.values():
        m = messages[ev['message_revision_id']]
        part = m['parts'][ev['part_index']]
        require(part['kind']=='text', 'evidence must target text')
        require(0 <= ev['start_cp'] < ev['end_cp'] <= len(part['text']), 'evidence bounds')
        require(part['text'][ev['start_cp']:ev['end_cp']]==ev['quote'], 'evidence quote mismatch')
        require(sha(ev['quote'])==ev['quote_sha256'], 'quote digest')
        require(ev['node_id'] in [o['node_id'] for o in m['occurrences']], 'evidence branch binding')
        require(ev['lineage_root_id'] in evidence, 'lineage missing')
    for c in claims.values():
        require(c['evidence_ids'] and all(e in evidence for e in c['evidence_ids']), 'claim evidence missing')
        require(c['scope']['workspace_id']==snap['workspace']['id'], 'workspace mismatch')
        if c['validity_kind']=='interval':
            require(c['valid_from'] is not None, 'interval start missing')
            require(c['valid_to'] is None or c['valid_to']>c['valid_from'], 'bad interval')
    seqs = [r['seq'] for r in snap['reviews']]
    require(seqs==sorted(set(seqs)), 'event sequence not strictly increasing')
    require([r['recorded_at'] for r in snap['reviews']]==sorted(r['recorded_at'] for r in snap['reviews']), 'event time regression')
    for r in snap['reviews']:
        if r['target_type']=='claim':
            require(r['target_id'] in claims,'review target')
        else:
            require(r['target_id'] in {v['id'] for v in snap['relations']},'relation target')
        if r['action']=='confirm_source':
            require(r['context_checked'] is True and r['branch_checked'] is True,'source confirmation incomplete')
            require(set(r['evidence_ids'])<=set(claims[r['target_id']]['evidence_ids']),'wrong review evidence')
    for rel in snap['relations']:
        require(rel['from_claim_id'] in claims and rel['to_claim_id'] in claims,'relation endpoints')
    print(f'PASS demo references, revisions, 6 evidence spans and {len(seqs)} event sequences')

    manifest = read('examples/export-manifest.json')
    require(sha(canonical(mem['payload']))==mem['payload_sha256']==manifest['payload_sha256'],'payload digest')
    require(sha((ROOT/'examples/memory-export.json').read_bytes())==manifest['json_sha256'],'actual JSON bytes')
    require(sha((ROOT/'examples/MEMORY.md').read_bytes())==manifest['markdown_sha256'],'actual Markdown bytes')
    state={k:snap[k] for k in ['workspace','source_files','import_batches','conversations','nodes','messages','claims','evidence','relations','reviews','memory_sets']}
    state['selected_memory_set_id']='set_orion_ready'
    require(sha(canonical(state))==manifest['state_sha256'],'state binding')
    for entry in mem['payload']['entries']:
        require(entry['claim_sha256']==sha(canonical(claims[entry['claim_id']])),'claim binding')
        require(entry['representation']=='user_decision' and entry['source_kind']=='user_decision','example output class')
        for cite in entry['citations']:
            require(cite['source_file_id'] in sources and cite['message_revision_id'] in messages,'export citation')
    require(len((ROOT/'examples/MEMORY.md').read_bytes()) <= 16000, 'memory byte budget')
    print('PASS payload, claim, state and actual exported-file digests')

    vectors = read('examples/canonical-vectors.json')['vectors']
    for v in vectors:
        c=canonical(v['input'])
        require(c==v['canonical_text'] and c.encode().hex()==v['utf8_hex'] and sha(c)==v['sha256'], 'canonical vector '+v['name'])
    print(f'PASS canonical UTF-8/SHA-256 vectors: {len(vectors)}')

    cases = read('fixtures/expected/import-cases.json')['cases']
    require(len({c['id'] for c in cases})==len(cases),'duplicate fixture case')
    for c in cases:
        for name in c['files']:
            require((ROOT/'fixtures'/name).is_file(),'fixture missing '+name)
    acceptance=(ROOT/'docs/ACCEPTANCE.md').read_text()
    require(re.findall(r'^### (AC\d{2}) ',acceptance,re.M)==[f'AC{i:02d}' for i in range(1,31)],'AC sequence')
    trace=(ROOT/'docs/TRACEABILITY.md').read_text()
    require(all(f'MA-{i:03d}' in trace for i in range(1,31)),'requirements trace incomplete')
    for f in ROOT.rglob('*.md'):
        for link in re.findall(r'\]\(([^)]+)\)',f.read_text()):
            if re.match(r'^[a-z]+:',link) or link.startswith('#'):
                continue
            target=link.split('#')[0]
            require((f.parent/target).resolve().exists(),f'broken link {f.relative_to(ROOT)} -> {link}')
    print(f'PASS {len(cases)} fixture-case references, 30 AC IDs, 30 requirement mappings and local Markdown links')

    pm=ROOT/'PACKAGE_MANIFEST.json'
    if pm.exists():
        data=json.loads(pm.read_text())
        for row in data['files']:
            target=ROOT/row['path']
            require(target.is_file() and sha(target.read_bytes())==row['sha256'],'package manifest '+row['path'])
        require(len(data['files'])==len([x for x in ROOT.rglob('*') if x.is_file() and x.name!='PACKAGE_MANIFEST.json']),'manifest file count')
        print(f'PASS package integrity manifest: {len(data["files"])} files')
    print('SUCCESS: specification bundle checks passed. No application/parser/browser/Windows tests were executed by this script.')

if __name__=='__main__':
    main()
