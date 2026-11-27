import { Link } from "react-router";
import { api, isDemo } from "../api";
import type { RankingEntry } from "../api/contract";
import { art } from "../art";
import { Badge, Card, Status, useResource, XpBar } from "../components/ui";

export function Passport() {
  const profile = useResource(api.me);
  const places = useResource(api.places);
  const completed = profile.data?.completedPlaceSlugs ?? [];
  const missions = places.data?.items ?? [];
  const ordered = [...missions].sort(
    (a, b) => Number(completed.includes(b.slug)) - Number(completed.includes(a.slug)),
  );

  return (
    <main className="screen padded section-stack passport">
      <header>
        <h1>Tu pasaporte cultural</h1>
        <Badge tone="gold">Explorador de Sucre</Badge>
      </header>
      {profile.data ? (
        <Card tone="navy passport-profile">
          <div>
            <span aria-hidden="true">◇</span>
            <div>
              <h2>{profile.data.alias}</h2>
              <small>Alias público</small>
            </div>
          </div>
          <XpBar level={profile.data.level} totalXp={profile.data.totalXp} />
        </Card>
      ) : (
        <Status {...profile} />
      )}
      <div>
        <h2>Historias que ya son tuyas</h2>
        {profile.data && (
          <p className="quiz-note">
            {completed.length}{" "}
            {completed.length === 1 ? "misión completada" : "misiones completadas"}
          </p>
        )}
      </div>
      {!places.data ? (
        <Status {...places} />
      ) : missions.length === 0 ? (
        <p>Aún no hay lugares disponibles.</p>
      ) : (
        <ul className="stamps">
          {ordered.map((place, index) => {
            const done = completed.includes(place.slug);
            return (
              <li key={place.slug}>
                <Link className={`stamp ${done ? "jade" : "outline"}`} to={`/place/${place.slug}`}>
                  <strong aria-hidden="true">{String(index + 1).padStart(2, "0")}</strong>
                  <div>
                    <h3>{place.name}</h3>
                    <small>
                      {profile.data ? (done ? "Descubierto" : "Por descubrir") : "Ver lugar"}
                    </small>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

export function Leaderboard() {
  const ranking = useResource(api.leaderboard);
  const profile = useResource(api.me);
  const items = [...(ranking.data?.items ?? [])].sort((a, b) => a.rank - b.rank);
  const top = items.slice(0, 3);
  const rest = items.slice(3);
  const ownId = profile.data?.userId;

  function entry(item: RankingEntry) {
    return (
      <>
        <strong>{String(item.rank).padStart(2, "0")}</strong>
        <div>
          <h3>
            {item.alias}
            {item.userId === ownId ? " · Tú" : ""}
          </h3>
          <small>{item.totalXp} XP</small>
        </div>
      </>
    );
  }

  return (
    <main className="screen padded section-stack leaderboard">
      <header>
        <div>
          <h1>Exploradores de Sucre</h1>
          <Badge tone="terra">{isDemo ? "Ranking de muestra" : "Ranking local"}</Badge>
        </div>
        <img src={art.explorer} alt="" />
      </header>
      <p className="quiz-note">Participas con tu alias público.</p>
      {!ranking.data ? (
        <Status {...ranking} />
      ) : !items.length ? (
        <p>Aún no hay posiciones en el ranking.</p>
      ) : (
        <>
          <ol aria-label="Primeras posiciones" className="podium">
            {top.map((item, index) => (
              <li className={`podium-${index + 1}`} key={item.userId}>
                <h3>
                  {item.alias}
                  {item.userId === ownId ? " · Tú" : ""}
                </h3>
                <div className="podium-step">
                  <strong>{item.rank}</strong>
                  <small>{item.totalXp} XP</small>
                </div>
              </li>
            ))}
          </ol>
          {rest.length > 0 && (
            <ol aria-label="Más exploradores" className="ranking-list" start={4}>
              {rest.map((item) => (
                <li className={item.userId === ownId ? "jade" : "outline"} key={item.userId}>
                  {entry(item)}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </main>
  );
}
