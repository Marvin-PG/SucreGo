-- SucreGo · Provisional seed data (idempotent)
-- Aligned with the 3 provisional slugs in apps/web/src/mocks/places.ts.
-- TODO: confirmar con responsable de contenido (lugares reales, categorías,
-- coordenadas, imágenes, fuentes verificadas y preguntas definitivas).

INSERT INTO public.places (
  slug,
  name,
  category,
  latitude,
  longitude,
  summary,
  image_url
)
VALUES
  (
    'lugar-candidato-1',
    'Lugar candidato 1',
    -- TODO: confirmar con responsable de contenido
    '[TEXTO DE EJEMPLO]',
    -- TODO: confirmar con responsable de contenido
    NULL,
    -- TODO: confirmar con responsable de contenido
    NULL,
    -- TODO: confirmar con responsable de contenido
    '[TEXTO DE EJEMPLO]',
    -- TODO: confirmar con responsable de contenido
    NULL
  ),
  (
    'lugar-candidato-2',
    'Lugar candidato 2',
    -- TODO: confirmar con responsable de contenido
    '[TEXTO DE EJEMPLO]',
    -- TODO: confirmar con responsable de contenido
    NULL,
    -- TODO: confirmar con responsable de contenido
    NULL,
    -- TODO: confirmar con responsable de contenido
    '[TEXTO DE EJEMPLO]',
    -- TODO: confirmar con responsable de contenido
    NULL
  ),
  (
    'lugar-candidato-3',
    'Lugar candidato 3',
    -- TODO: confirmar con responsable de contenido
    '[TEXTO DE EJEMPLO]',
    -- TODO: confirmar con responsable de contenido
    NULL,
    -- TODO: confirmar con responsable de contenido
    NULL,
    -- TODO: confirmar con responsable de contenido
    '[TEXTO DE EJEMPLO]',
    -- TODO: confirmar con responsable de contenido
    NULL
  )
ON CONFLICT (slug) DO NOTHING;

-- 3 provisional questions per place (positions 1, 2, 3)
-- TODO: confirmar con responsable de contenido (enunciados, opciones,
-- correct_index y explicaciones basadas en fuentes verificadas).
INSERT INTO public.questions (
  place_slug,
  position,
  prompt,
  options,
  correct_index,
  explanation
)
VALUES
  -- lugar-candidato-1
  (
    'lugar-candidato-1',
    1,
    '[TEXTO DE EJEMPLO]',
    '[
      {"optionId": "A", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "B", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "C", "text": "[TEXTO DE EJEMPLO]"}
    ]'::jsonb,
    0,
    '[TEXTO DE EJEMPLO]'
  ),
  (
    'lugar-candidato-1',
    2,
    '[TEXTO DE EJEMPLO]',
    '[
      {"optionId": "A", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "B", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "C", "text": "[TEXTO DE EJEMPLO]"}
    ]'::jsonb,
    1,
    '[TEXTO DE EJEMPLO]'
  ),
  (
    'lugar-candidato-1',
    3,
    '[TEXTO DE EJEMPLO]',
    '[
      {"optionId": "A", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "B", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "C", "text": "[TEXTO DE EJEMPLO]"}
    ]'::jsonb,
    2,
    '[TEXTO DE EJEMPLO]'
  ),
  -- lugar-candidato-2
  (
    'lugar-candidato-2',
    1,
    '[TEXTO DE EJEMPLO]',
    '[
      {"optionId": "A", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "B", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "C", "text": "[TEXTO DE EJEMPLO]"}
    ]'::jsonb,
    0,
    '[TEXTO DE EJEMPLO]'
  ),
  (
    'lugar-candidato-2',
    2,
    '[TEXTO DE EJEMPLO]',
    '[
      {"optionId": "A", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "B", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "C", "text": "[TEXTO DE EJEMPLO]"}
    ]'::jsonb,
    1,
    '[TEXTO DE EJEMPLO]'
  ),
  (
    'lugar-candidato-2',
    3,
    '[TEXTO DE EJEMPLO]',
    '[
      {"optionId": "A", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "B", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "C", "text": "[TEXTO DE EJEMPLO]"}
    ]'::jsonb,
    2,
    '[TEXTO DE EJEMPLO]'
  ),
  -- lugar-candidato-3
  (
    'lugar-candidato-3',
    1,
    '[TEXTO DE EJEMPLO]',
    '[
      {"optionId": "A", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "B", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "C", "text": "[TEXTO DE EJEMPLO]"}
    ]'::jsonb,
    0,
    '[TEXTO DE EJEMPLO]'
  ),
  (
    'lugar-candidato-3',
    2,
    '[TEXTO DE EJEMPLO]',
    '[
      {"optionId": "A", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "B", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "C", "text": "[TEXTO DE EJEMPLO]"}
    ]'::jsonb,
    1,
    '[TEXTO DE EJEMPLO]'
  ),
  (
    'lugar-candidato-3',
    3,
    '[TEXTO DE EJEMPLO]',
    '[
      {"optionId": "A", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "B", "text": "[TEXTO DE EJEMPLO]"},
      {"optionId": "C", "text": "[TEXTO DE EJEMPLO]"}
    ]'::jsonb,
    2,
    '[TEXTO DE EJEMPLO]'
  )
ON CONFLICT (place_slug, position) DO NOTHING;

-- TODO: confirmar con responsable de contenido — no se cargan filas en
-- public.sources hasta contar con fuentes históricas verificadas.
