import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import type { ChatReply, PlaceDetail } from "../api/contract";
import { art, placeArt } from "../art";
import {
  Action,
  Back,
  Badge,
  Card,
  errorMessage,
  Sources,
  Status,
  useResource,
} from "../components/ui";

export function PlacePage({ slug, guide }: { slug: string; guide?: boolean }) {
  const load = useCallback(() => api.place(slug), [slug]);
  const resource = useResource(load);
  if (!resource.data) {
    return (
      <main className="screen padded">
        <Back to="/explore" />
        <h1>Detalle del lugar</h1>
        <Status {...resource} />
      </main>
    );
  }

  const place = resource.data;
  if (guide) return <Guide place={place} />;
  return (
    <main className="screen detail">
      <div className="detail-hero">
        <img src={place.imageUrl ?? placeArt[slug] ?? art.city} alt="" />
        <Back to="/explore" />
      </div>
      <div className="section-stack padded">
        <Badge tone="terra">Patrimonio cultural</Badge>
        <div className="detail-heading">
          <h1>{place.name}</h1>
          {slug === "plaza-25-de-mayo" && <img src={art.plaza} alt="" />}
          {slug === "la-recoleta" && <img src={art.recoleta} alt="" />}
        </div>
        <p>{place.summary}</p>
        <Card tone="navy">
          <h2>Una historia por descubrir</h2>
          <p>{place.description}</p>
        </Card>
        <Sources items={place.sources} />
        <Badge tone="jade">◇ Misión cultural</Badge>
        <Action to={`/place/${slug}/guide`}>Comenzar lección →</Action>
        <Action to="/explore" tone="outline">
          Volver al mapa
        </Action>
      </div>
    </main>
  );
}

const prompts = ["¿Por qué es importante este lugar?", "¿Qué ocurrió aquí?"];

function Guide({ place }: { place: PlaceDetail }) {
  const { slug } = place;
  const load = useCallback(() => api.lesson(slug), [slug]);
  const lesson = useResource(load);
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<{ question: string; reply: ChatReply }[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError("");
    try {
      const reply = await api.chat(slug, trimmed);
      setConversation((previous) => [...previous, { question: trimmed, reply }]);
      setMessage("");
    } catch (error) {
      setMessage(trimmed);
      setError(errorMessage(error));
    } finally {
      setSending(false);
    }
  }

  function send(event: FormEvent) {
    event.preventDefault();
    void ask(message);
  }

  return (
    <main className="screen padded section-stack guide">
      <header className="page-header">
        <Back to={`/place/${slug}`} />
        <div>
          <h1>{place.name}</h1>
          <small>Guía cultural</small>
        </div>
      </header>
      <Card tone="navy guide-banner">
        <span aria-hidden="true">✧</span>
        <div>
          <h2>Tu guía, a cada paso</h2>
          <p>Historias breves. Grandes descubrimientos.</p>
        </div>
      </Card>
      {lesson.data ? (
        <>
          <Card tone="lesson">
            <Badge>Un lugar, muchas historias</Badge>
            <h2>{lesson.data.title}</h2>
            <p>{lesson.data.content}</p>
          </Card>
          <Sources items={lesson.data.sources} />
        </>
      ) : (
        <Status {...lesson} />
      )}
      <h2>¿Qué te gustaría descubrir?</h2>
      <div className="suggestions">
        {prompts.map((prompt) => (
          <button
            className="outline"
            disabled={sending}
            key={prompt}
            onClick={() => void ask(prompt)}
            type="button"
          >
            {prompt}
          </button>
        ))}
      </div>
      <div className="conversation" aria-live="polite">
        {conversation.map(({ question, reply }, index) => (
          <Card key={index}>
            <h3>{question}</h3>
            {reply.abstained && <Badge tone="terra">Respuesta no verificada</Badge>}
            <p>{reply.answer}</p>
            {reply.citations.length > 0 && <Sources items={reply.citations} />}
          </Card>
        ))}
      </div>
      {sending && <p role="status">Consultando al guía…</p>}
      {error && <Status error={error} />}
      <form className="chat-form outline" onSubmit={send}>
        <input
          aria-label="Pregunta al guía"
          disabled={sending}
          maxLength={1000}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Pregúntame sobre este lugar…"
          value={message}
        />
        <button aria-label="Enviar pregunta" disabled={!message.trim() || sending} type="submit">
          ➤
        </button>
      </form>
      <Action to={`/place/${slug}/quiz`}>Iniciar desafío →</Action>
    </main>
  );
}
