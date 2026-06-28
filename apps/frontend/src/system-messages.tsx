import type {ReactElement} from 'react';

type SystemMessage = {
  id: string;
  content: string;
};

type SystemMessagesProps = {
  messages: SystemMessage[];
};

export function SystemMessages({messages}: SystemMessagesProps): ReactElement | null {
  if (messages.length === 0) return null;

  return (
    <aside className="system-messages panel panel--wide" aria-label="État du chat" aria-live="polite">
      <div className="panel-header">
        <h2>État du chat</h2>
        <span className="counter">{messages.length}</span>
      </div>
      <div className="system-message-list">
        {messages.slice(-3).map((message) => (
          <p className="system-message" key={message.id}>
            {message.content}
          </p>
        ))}
      </div>
    </aside>
  );
}
