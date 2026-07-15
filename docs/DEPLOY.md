# Implantação do protótipo

O frontend e a API são publicados como um único serviço Docker. Isso mantém `/api` na mesma origem,
reduz configuração de CORS e evita dois serviços no piloto.

## 1. Supabase

1. Crie um projeto e execute `supabase/schema.sql` no SQL Editor.
2. Em Authentication, habilite login por e-mail e configure a URL pública como redirect permitido.
3. Defina o primeiro administrador alterando `profiles.role` para `admin` diretamente no painel.

## 2. Render

1. No painel da Render, escolha **New > Blueprint** e conecte este repositório.
2. Cadastre as variáveis marcadas como secretas em `render.yaml`.
3. Use a URL criada pela Render como Site URL e Redirect URL no Supabase.

As variáveis `VITE_SUPABASE_*` são incorporadas durante o build e contêm somente a chave pública.
`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` e `GEMINI_API_KEY` ficam exclusivas no servidor.

## 3. Verificação mínima

- abra `/api/health` e confirme `{"ok":true}`;
- teste login por link mágico;
- confirme que estudante não vê Estúdio, fila editorial ou administração;
- gere uma questão com um administrador e confira sua persistência;
- aprove a questão na fila e responda como estudante;
- confira a tentativa no dashboard administrativo.
