# SucreGo API contract (propuesta)

Base URL local: `http://localhost:3001`. Los ejemplos muestran el cuerpo JSON; las respuestas
correctas usan los códigos HTTP indicados.

## Convenciones

- Los IDs de lugar son `slug` legibles (por ejemplo, `lugar-candidato-1`); los IDs de usuario,
  lección, quiz, pregunta y request son UUID.
- Las fechas y horas usan ISO 8601 en UTC, por ejemplo `2026-11-27T15:00:00.000Z`.
- Los lugares y el ranking son públicos. Lecciones, chat, quizzes y perfil requieren la sesión
  anónima de Supabase. El cliente envía el access token en
  `Authorization: Bearer <supabase-access-token>`. El servidor valida el JWT y obtiene el UUID del
  usuario; el alias público nunca se usa como identidad.
- La respuesta correcta de ninguna pregunta se entrega al cliente. Solo `POST .../quiz/submit`
  evalúa las respuestas en el servidor.
- Los textos históricos de los ejemplos son marcadores, no contenido publicado. Las fuentes reales
  deben acompañar cualquier texto histórico antes de su uso.

### Formato estándar de error

Todos los errores usan el mismo objeto:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "La solicitud no es válida.",
    "requestId": "f57d40aa-3068-4ed1-bf19-a94dd77f7b50",
    "details": {
      "field": "answers"
    }
  }
}
```

`details` es opcional; `requestId` es un UUID para correlacionar el error con los logs del servidor.
Errores comunes: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `404 NOT_FOUND`, `409 CONFLICT`,
`429 RATE_LIMITED` y `500 INTERNAL_ERROR`. Una dependencia externa no disponible responde
`503 SERVICE_UNAVAILABLE`. No se incluyen secretos ni respuestas correctas en errores.

## Endpoints

### 1. Listar lugares

- **Método y ruta:** `GET /api/places`
- **Auth:** pública.
- **Request:** sin body ni parámetros requeridos.
- **Response `200`:**

```json
{
  "items": [
    {
      "slug": "lugar-candidato-1",
      "name": "Lugar candidato 1",
      "summary": "[TEXTO DE EJEMPLO]",
      "coordinates": { "latitude": null, "longitude": null },
      "imageUrl": null
    }
  ],
  "nextCursor": null
}
```

- **Errores posibles:** `500 INTERNAL_ERROR`, `503 SERVICE_UNAVAILABLE`.

### 2. Obtener detalle de un lugar

- **Método y ruta:** `GET /api/places/:id` (el parámetro `id` es el slug).
- **Auth:** pública.
- **Request:** sin body; ejemplo de ruta `GET /api/places/lugar-candidato-1`.
- **Response `200`:**

```json
{
  "slug": "lugar-candidato-1",
  "name": "Lugar candidato 1",
  "summary": "[TEXTO DE EJEMPLO]",
  "description": "[TEXTO DE EJEMPLO]",
  "coordinates": { "latitude": null, "longitude": null },
  "imageUrl": null,
  "sources": []
}
```

- **Errores posibles:** `400 VALIDATION_ERROR` (slug inválido), `404 NOT_FOUND`,
  `500 INTERNAL_ERROR`.

### 3. Crear/obtener la lección de un lugar

- **Método y ruta:** `POST /api/places/:id/lesson` (el parámetro `id` es el slug).
- **Auth:** requerida.
- **Request:** sin body; el lugar se identifica en la ruta.
- **Response `200`:**

```json
{
  "lessonId": "d91399b7-481c-4cc7-99d8-fd41ffbe028e",
  "placeSlug": "lugar-candidato-1",
  "title": "[TEXTO DE EJEMPLO]",
  "content": "[TEXTO DE EJEMPLO]",
  "sources": [],
  "createdAt": "2026-11-27T15:00:00.000Z"
}
```

- **Errores posibles:** `401 UNAUTHORIZED`, `404 NOT_FOUND`, `429 RATE_LIMITED`,
  `500 INTERNAL_ERROR`, `503 SERVICE_UNAVAILABLE` (generación o recuperación no disponible).

### 4. Enviar una pregunta al guía

- **Método y ruta:** `POST /api/places/:id/chat` (el parámetro `id` es el slug).
- **Auth:** requerida.
- **Request:**

```json
{
  "message": "¿Qué se conoce sobre este lugar?"
}
```

- **Response `200`:**

```json
{
  "answer": "[TEXTO DE EJEMPLO]",
  "citations": [],
  "abstained": true,
  "createdAt": "2026-11-27T15:01:00.000Z"
}
```

`abstained` es `true` si el corpus revisado no respalda una respuesta. `citations` solo contiene
fuentes verificadas.

- **Errores posibles:** `400 VALIDATION_ERROR` (mensaje vacío o demasiado largo),
  `401 UNAUTHORIZED`, `404 NOT_FOUND`, `429 RATE_LIMITED`, `500 INTERNAL_ERROR`,
  `503 SERVICE_UNAVAILABLE`.

### 5. Obtener el quiz de un lugar

- **Método y ruta:** `GET /api/places/:id/quiz` (el parámetro `id` es el slug).
- **Auth:** requerida.
- **Request:** sin body; el lugar se identifica en la ruta.
- **Response `200`:**

```json
{
  "quizId": "0878e376-fcfe-4aca-9043-f7349f0664eb",
  "placeSlug": "lugar-candidato-1",
  "questions": [
    {
      "questionId": "04639bbc-12b6-4115-b8e9-227ad22bd903",
      "prompt": "[TEXTO DE EJEMPLO]",
      "options": [
        { "optionId": "A", "text": "[TEXTO DE EJEMPLO]" },
        { "optionId": "B", "text": "[TEXTO DE EJEMPLO]" },
        { "optionId": "C", "text": "[TEXTO DE EJEMPLO]" }
      ]
    },
    {
      "questionId": "962fd1de-7c5e-46ae-838a-a724652ea63e",
      "prompt": "[TEXTO DE EJEMPLO]",
      "options": [
        { "optionId": "A", "text": "[TEXTO DE EJEMPLO]" },
        { "optionId": "B", "text": "[TEXTO DE EJEMPLO]" },
        { "optionId": "C", "text": "[TEXTO DE EJEMPLO]" }
      ]
    },
    {
      "questionId": "e00a232c-4779-4c10-bd4b-974a7402556a",
      "prompt": "[TEXTO DE EJEMPLO]",
      "options": [
        { "optionId": "A", "text": "[TEXTO DE EJEMPLO]" },
        { "optionId": "B", "text": "[TEXTO DE EJEMPLO]" },
        { "optionId": "C", "text": "[TEXTO DE EJEMPLO]" }
      ]
    }
  ]
}
```

El quiz tiene tres preguntas. La respuesta no contiene respuestas correctas, claves de evaluación,
ni campos equivalentes.

- **Errores posibles:** `401 UNAUTHORIZED`, `404 NOT_FOUND`, `500 INTERNAL_ERROR`.

### 6. Enviar respuestas del quiz

- **Método y ruta:** `POST /api/places/:id/quiz/submit` (el parámetro `id` es el slug).
- **Auth:** requerida.
- **Request:**

```json
{
  "quizId": "0878e376-fcfe-4aca-9043-f7349f0664eb",
  "answers": [
    { "questionId": "04639bbc-12b6-4115-b8e9-227ad22bd903", "optionId": "A" },
    { "questionId": "962fd1de-7c5e-46ae-838a-a724652ea63e", "optionId": "B" },
    { "questionId": "e00a232c-4779-4c10-bd4b-974a7402556a", "optionId": "C" }
  ]
}
```

- **Response `200`:**

```json
{
  "correctCount": 2,
  "totalQuestions": 3,
  "passed": true,
  "xpAwarded": 100,
  "totalXp": 100,
  "level": "Investigador",
  "firstCompletion": true
}
```

Aprueba con al menos dos respuestas correctas de tres. El servidor evalúa y concede 100 XP solo en
la primera finalización de la misión. Reintentos posteriores informan `xpAwarded: 0`.

- **Errores posibles:** `400 VALIDATION_ERROR` (quiz, preguntas u opciones inválidos),
  `401 UNAUTHORIZED`, `404 NOT_FOUND`, `409 CONFLICT` (envío duplicado incompatible),
  `500 INTERNAL_ERROR`.

### 7. Obtener el perfil propio

- **Método y ruta:** `GET /api/me`
- **Auth:** requerida.
- **Request:** sin body.
- **Response `200`:**

```json
{
  "userId": "2fa53087-367f-4dcf-92e1-01c6979ca813",
  "alias": "Explorador-42",
  "totalXp": 100,
  "level": "Investigador",
  "completedPlaceSlugs": ["lugar-candidato-1"],
  "createdAt": "2026-11-27T14:00:00.000Z"
}
```

- **Errores posibles:** `401 UNAUTHORIZED`, `404 NOT_FOUND` (perfil aún no creado),
  `500 INTERNAL_ERROR`.

### 8. Obtener el ranking

- **Método y ruta:** `GET /api/leaderboard`
- **Auth:** pública.
- **Request:** sin body ni parámetros requeridos.
- **Response `200`:**

```json
{
  "items": [
    {
      "rank": 1,
      "userId": "2fa53087-367f-4dcf-92e1-01c6979ca813",
      "alias": "Explorador-42",
      "totalXp": 100,
      "level": "Investigador"
    }
  ],
  "generatedAt": "2026-11-27T15:02:00.000Z"
}
```

Solo se publica el alias, nunca el nombre real u otros datos personales.

- **Errores posibles:** `500 INTERNAL_ERROR`, `503 SERVICE_UNAVAILABLE`.

## Estado

Los endpoints P0 están disponibles en el servidor. La guía requiere Gemini y el corpus aprobado.
Los endpoints de datos requieren el esquema inicial y la configuración de Supabase.
