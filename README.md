# Loja B'RITT

Loja em React + Vite com backend Node/Express para gerenciar produtos, upload de imagens e persistencia no banco.

## Desenvolvimento

1. Instale as dependencias:
   `npm install`
2. Crie `.env` a partir de `.env.example`.
3. Rode:
   `npm run dev`

O frontend sobe no Vite e a API fica em `http://localhost:3001`.

## Publicacao

O projeto esta preparado para subir como app unica:

1. Gere o build:
   `npm run build`
2. Suba o servidor:
   `npm start`
3. Verifique:
   `http://SEU-DOMINIO/api/health`

Quando existir `dist/index.html`, o backend tambem serve o frontend. Se o build nao existir, ele sobe em modo API-only e avisa no log.

## Colocar online na Vercel

O projeto agora tambem esta pronto para deploy na Vercel com:

- frontend estatico saindo de `dist/`
- API Express publicada em `api/[...route].js`
- configuracao em `vercel.json`

### Passo a passo

1. Suba este projeto para um repositorio no GitHub.
2. Na Vercel, clique em `Add New...` > `Project`.
3. Importe o repositorio `loja-britt`.
4. Confirme estas configuracoes:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Cadastre as variaveis de ambiente da aplicacao:
   - `DATABASE_URL`
   - `DATABASE_SCHEMA`
   - `DATABASE_TABLE`
   - `CLOUDINARY_URL`
   - `CLOUDINARY_FOLDER`
6. Rode o deploy.
7. Depois do deploy, valide:
   - `https://SEU-DOMINIO.vercel.app/api/health`

### Importante na Vercel

- O fallback em arquivo local nao e indicado na Vercel. Em producao, configure `DATABASE_URL`.
- Upload local em `server/uploads/` tambem nao persiste na Vercel. Para upload de imagens, configure `CLOUDINARY_URL`.
- Se houver produtos antigos apontando para `/uploads/...`, essas imagens precisam ser reenviadas ou migradas antes do deploy.
- As imagens usadas pelo frontend agora ficam em `public/img`, entao entram no build estatico corretamente.

## Colocar online no Render

O jeito mais simples para compartilhar com seus amigos e usar o Render:

1. Suba este projeto para um repositorio no GitHub.
2. Entre em `https://dashboard.render.com/`.
3. Clique em `New` > `Blueprint`.
4. Selecione o repositorio.
5. O Render vai ler o arquivo `render.yaml` da raiz e criar o servico com:
   - build: `npm install && npm run build`
   - start: `npm start`
   - healthcheck: `/api/health`
6. Na criacao, preencha os secrets pedidos:
   - `DATABASE_URL`
   - `CLOUDINARY_URL`
7. Depois do deploy, abra a URL `https://SEU-SERVICO.onrender.com`.

Para hobby/prototipo, o plano `free` pode servir. As proprias docs do Render avisam que o free tem limitacoes e nao e ideal para producao critica.

## Neon para produtos

Use uma connection string de uma role que consiga acessar a tabela de produtos:

```env
PORT=3001
DATABASE_URL=postgresql://app_user:password@seu-host-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
DATABASE_SCHEMA=public
DATABASE_TABLE=products
```

Se sua role atual nao puder criar tabela no schema `public`, rode o script abaixo no SQL Editor da Neon com uma role administradora:

`server/sql/neon-products.sql`

Depois disso, a aplicacao consegue usar a role restrita em runtime. Quando a tabela estiver vazia, os produtos padrao sao criados automaticamente.

## Upload de imagens

- Cada produto aceita ate 8 imagens.
- A primeira imagem da galeria vira a capa.
- Sem Cloudinary configurado, os uploads ficam em `server/uploads/`.

## Cloudinary para producao

Para deixar as imagens prontas para producao sem depender do disco do servidor, configure o Cloudinary:

```env
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CLOUDINARY_FOLDER=loja-britt/products
```

Quando `CLOUDINARY_URL` existir, os novos uploads passam a ir para o Cloudinary automaticamente, e imagens removidas de um produto tambem sao apagadas de la. O painel continua igual no site.

Se preferir, tambem da para usar as variaveis separadas `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`.

Sem Cloudinary, em hospedagens sem disco persistente, voce ainda vai precisar montar volume para `server/uploads/`.

## Docker

Tambem existe um `Dockerfile` pronto para deploy:

1. Build da imagem:
   `docker build -t loja-britt .`
2. Subida do container:
   `docker run -p 3001:3001 --env-file .env loja-britt`

Para manter uploads no servidor, monte um volume no caminho `/app/server/uploads`.
