# Estudo Pessoal

Aplicativo React para organizar joias espirituais, pesquisas e anotações de discursos. A interface é responsiva, instalável como PWA e mantém compatibilidade com as coleções existentes no Firebase.

## Desenvolvimento

Requisitos: Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
npm run preview
```

## Estrutura

- `src/App.jsx`: autenticação e estrutura geral.
- `src/Study.jsx`: joias, Bíblia, pesquisas e busca.
- `src/Speeches.jsx`: categorias e anotações de discursos.
- `src/styles.css`: sistema visual responsivo, sem CSS externo.
- `public/sw.js`: cache do aplicativo para conexões instáveis.
- `public/manifest.webmanifest`: instalação no celular.

## Publicação

O fluxo em `.github/workflows/deploy-pages.yml` compila e publica o projeto no GitHub Pages após alterações na branch `main`. No repositório, a origem do Pages deve estar configurada como **GitHub Actions**.
