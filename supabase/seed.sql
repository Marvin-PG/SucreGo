-- SucreGo · Seed data (idempotent)
-- Confirmed places (slugs and coordinates); historical texts, categories,
-- images, verified sources and final quiz questions remain pending content sign-off.
-- TODO: confirmar con responsable de contenido (categorías, resúmenes,
-- descripciones, imágenes, fuentes verificadas y preguntas definitivas).

INSERT INTO public.places (
  slug,
  name,
  category,
  latitude,
  longitude,
  summary,
  description,
  image_url
)
VALUES
  (
    'plaza-25-de-mayo',
    'Plaza 25 de Mayo',
    -- TODO: confirmar con responsable de contenido
    '[TEXTO DE EJEMPLO]',
    -19.04790,
    -65.25952,
    -- TODO: confirmar con responsable de contenido
    '[TEXTO DE EJEMPLO]',
    -- TODO: confirmar con responsable de contenido
    '[TEXTO DE EJEMPLO]',
    -- TODO: confirmar con responsable de contenido
    NULL
  ),
  (
    'casa-de-la-libertad',
    'Casa de la Libertad',
    -- TODO: confirmar con responsable de contenido
    '[TEXTO DE EJEMPLO]',
    -19.04745,
    -65.26038,
    -- TODO: confirmar con responsable de contenido
    '[TEXTO DE EJEMPLO]',
    -- TODO: confirmar con responsable de contenido
    '[TEXTO DE EJEMPLO]',
    -- TODO: confirmar con responsable de contenido
    NULL
  ),
  (
    'la-recoleta',
    'La Recoleta',
    -- TODO: confirmar con responsable de contenido
    '[TEXTO DE EJEMPLO]',
    -19.05451,
    -65.25398,
    -- TODO: confirmar con responsable de contenido
    '[TEXTO DE EJEMPLO]',
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
  -- plaza-25-de-mayo
  (
    'plaza-25-de-mayo',
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
    'plaza-25-de-mayo',
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
    'plaza-25-de-mayo',
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
  -- casa-de-la-libertad
  (
    'casa-de-la-libertad',
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
    'casa-de-la-libertad',
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
    'casa-de-la-libertad',
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
  -- la-recoleta
  (
    'la-recoleta',
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
    'la-recoleta',
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
    'la-recoleta',
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
