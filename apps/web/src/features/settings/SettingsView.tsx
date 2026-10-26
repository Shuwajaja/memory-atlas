import { useState } from 'react';
import { LIMITS } from '../../domain/limits';
import { Dialog } from '../../components/Dialog';
import { useAtlas } from '../../service-context';

export function SettingsView() {
  const { service, state } = useAtlas();
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <section className="stack">
      <h2>Einstellungen</h2>
      <p>Sitzung {service.sessionId()}</p>
      <p>Zeitzone {state.snapshot.workspace.timezone}</p>
      <p>Themenregel {state.snapshot.workspace.topic_policy}</p>
      <p>Richtlinie {state.snapshot.workspace.policy_version}</p>
      <p>Datei bis {LIMITS.fileBytes} Bytes, Batch bis {LIMITS.batchBytes} Bytes, {LIMITS.files} Dateien, {LIMITS.messages} Nachrichten.</p>
      <p>Memory höchstens {LIMITS.maxClaims} Karten und {LIMITS.maxTextBytes} Textbytes.</p>
      <p>Das Claude-Profil ist nicht freigegeben. Gemini wird nicht importiert. Es gibt keinen Cloud-Dienst und keine Telemetrie.</p>
      <p>Freigaben liegen nur im Arbeitsspeicher und werden nicht in den Browser-Speicher geschrieben.</p>
      <button type="button" id="clear-session" className="button danger" onClick={() => setConfirmClear(true)}>Sitzung leeren</button>
      {confirmClear ? (
        <Dialog title="Sitzung leeren" onClose={() => setConfirmClear(false)}>
          <p>Die Sitzung wird geleert. Heruntergeladene Dateien bleiben auf dem Gerät.</p>
          <div className="row">
            <button type="button" className="button danger" onClick={() => { service.clearSession(); setConfirmClear(false); }}>Wirklich leeren</button>
            <button type="button" className="button" onClick={() => setConfirmClear(false)}>Abbrechen</button>
          </div>
        </Dialog>
      ) : null}
    </section>
  );
}
