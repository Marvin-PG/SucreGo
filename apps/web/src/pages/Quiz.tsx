import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { api, isDemo } from "../api";
import type { Quiz, Result, Submission } from "../api/contract";
import { art } from "../art";
import {
  Action,
  Back,
  Badge,
  Card,
  errorMessage,
  Status,
  useResource,
  XpBar,
} from "../components/ui";

export function QuizPage({ slug, onResult }: { slug: string; onResult: (result: Result) => void }) {
  const loadPlace = useCallback(() => api.place(slug), [slug]);
  const loadQuiz = useCallback(() => api.quiz(slug), [slug]);
  const place = useResource(loadPlace);
  const quiz = useResource(loadQuiz);

  return (
    <main className="screen padded section-stack quiz">
      <header className="page-header">
        <Back to={`/place/${slug}/guide`} />
        <h1>{place.data?.name ?? "Desafío cultural"}</h1>
      </header>
      {place.error && <Status error={place.error} retry={place.retry} />}
      {!quiz.data ? (
        <Status {...quiz} />
      ) : quiz.data.questions.length === 3 ? (
        <QuizForm quiz={quiz.data} slug={slug} onResult={onResult} />
      ) : (
        <Status error="Este desafío debe contener tres preguntas." retry={quiz.retry} />
      )}
    </main>
  );
}

function QuizForm({
  quiz,
  slug,
  onResult,
}: {
  quiz: Quiz;
  slug: string;
  onResult: (result: Result) => void;
}) {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Submission["answers"]>([]);
  const [selected, setSelected] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const index = answers.length;
  const question = quiz.questions[index];
  const last = index === quiz.questions.length - 1;

  async function advance() {
    if (!selected || submitting.current) return;
    const next = [...answers, { questionId: question.questionId, optionId: selected }];
    if (!last) {
      setAnswers(next);
      setSelected("");
      return;
    }
    submitting.current = true;
    setSending(true);
    setError("");
    try {
      const result = await api.submit(slug, { quizId: quiz.quizId, answers: next });
      if (!mounted.current) return;
      onResult(result);
      navigate(`/place/${slug}/result`, { replace: true });
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      submitting.current = false;
      setSending(false);
    }
  }

  return (
    <>
      <div className="quiz-progress">
        <div>
          <Badge>Desafío cultural</Badge>
          <strong>
            {index + 1} / {quiz.questions.length}
          </strong>
        </div>
        <progress max={quiz.questions.length} value={index + 1} aria-label="Progreso del desafío" />
      </div>
      <img className="quiz-mascot" alt="" src={art.thinking} />
      <fieldset key={question.questionId} className="quiz-options" disabled={sending}>
        <legend>{question.prompt}</legend>
        {question.options.map((option) => (
          <label
            className={`option ${selected === option.optionId ? "selected" : ""}`}
            key={option.optionId}
          >
            <input
              className="sr-only"
              type="radio"
              name={question.questionId}
              value={option.optionId}
              checked={selected === option.optionId}
              onChange={() => setSelected(option.optionId)}
            />
            <b>{option.optionId}</b> {option.text}
          </label>
        ))}
      </fieldset>
      <p className="quiz-note">Tres preguntas · Apruebas con dos aciertos.</p>
      {error && <Status error={error} />}
      <button
        className="action"
        type="button"
        disabled={!selected || sending}
        onClick={() => void advance()}
      >
        {sending
          ? "Enviando respuestas…"
          : selected
            ? last
              ? "Ver resultado →"
              : "Siguiente pregunta →"
            : "Selecciona una respuesta"}
      </button>
    </>
  );
}

export function ResultPage({ slug, result }: { slug: string; result?: Result }) {
  const quizPath = `/place/${slug}/quiz`;
  if (!result) {
    return (
      <main className="screen padded section-stack">
        <h1>Resultado del desafío</h1>
        <p>Completa el desafío para consultar tu resultado.</p>
        <Action to={quizPath}>Ir al desafío →</Action>
        <Action to="/explore" tone="outline">
          Volver al mapa
        </Action>
      </main>
    );
  }

  return (
    <main className="screen padded section-stack result">
      <Badge tone={result.passed ? "jade" : "terra"}>
        {result.passed ? "Aventura completada" : "Desafío terminado"}
      </Badge>
      <div className={`result-art ${result.passed ? "jade" : "terra"}`}>
        <img
          alt=""
          src={result.passed ? (slug === "casa-de-la-libertad" ? art.stamp : art.happy) : art.retry}
        />
      </div>
      <h1>{result.passed ? "¡Misión completada!" : "Una historia más por aprender"}</h1>
      <p>
        {result.correctCount}/{result.totalQuestions} respuestas correctas
      </p>
      {isDemo ? (
        <Card tone="gold">
          <h2>Resultado de muestra</h2>
          <p>Esta partida de demostración no concede XP.</p>
        </Card>
      ) : (
        result.passed && (
          <Card tone="gold">
            <h2>+{result.xpAwarded} XP</h2>
            <p>
              {result.firstCompletion
                ? "Un nuevo sello en tu pasaporte."
                : "Ya tienes el sello de esta misión."}
            </p>
          </Card>
        )
      )}
      {!isDemo && <XpBar level={result.level} totalXp={result.totalXp} />}
      {result.passed ? (
        <Action to="/explore">Volver al mapa</Action>
      ) : (
        <Action to={quizPath}>Reintentar desafío →</Action>
      )}
      <Action to={result.passed ? "/passport" : "/explore"} tone="outline">
        {result.passed ? "Ver mi pasaporte" : "Volver al mapa"}
      </Action>
    </main>
  );
}
