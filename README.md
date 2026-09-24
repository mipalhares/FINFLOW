# FinFlow

PWA (app instalável, sem loja) para organizar finanças pessoais com comando de voz, foto de nota fiscal (OCR) e planejamento de gastos futuros. 100% em camadas gratuitas.

## O que já está pronto

- **Login/cadastro** com e-mail e senha (Firebase Auth)
- **Início**: saldo do mês, entradas, gastos e lista de lançamentos, em tempo real (Firestore)
- **Lançar**: comando de voz (Web Speech API), foto de nota fiscal com leitura automática do valor (Tesseract.js, roda no navegador, sem custo), e lançamento manual
- **Planejar**: cadastra um gasto futuro com data e o app calcula quanto guardar por dia até lá
- **Dicas**: conteúdo educativo (não é recomendação de investimento personalizada — veja nota abaixo)
- App instalável (PWA) com ícone na tela inicial e funcionamento básico offline

## Passo a passo para colocar no ar — grátis

### 1. Criar o projeto no Firebase
1. Acesse [console.firebase.google.com](https://console.firebase.google.com) e crie um projeto novo (plano Spark, gratuito).
2. Em **Build > Authentication > Sign-in method**, ative **E-mail/senha**.
3. Em **Build > Firestore Database**, crie o banco em modo produção, na região mais próxima (ex: `southamerica-east1`).
4. Em **Configurações do projeto (⚙) > Geral > Seus apps**, clique no ícone Web `</>`, registre um app e copie o objeto `firebaseConfig`.
5. Cole esses valores em `js/firebase-config.js`, substituindo os campos `"COLE_AQUI"`.

### 2. Publicar as regras de segurança do Firestore
No console do Firebase, vá em **Firestore Database > Regras** e cole o conteúdo do arquivo `firestore.rules` deste projeto. Sem isso, qualquer pessoa poderia ler/escrever os dados de qualquer usuário.

### 3. Subir para o GitHub
```bash
cd finflow
git init
git add .
git commit -m "primeira versão do FinFlow"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/finflow.git
git push -u origin main
```

### 4. Publicar de graça (escolha uma opção)

**Opção A — GitHub Pages** (mais simples)
1. No repositório, vá em **Settings > Pages**.
2. Em "Source", escolha a branch `main` e a pasta `/ (root)`.
3. Em alguns minutos o app estará em `https://SEU-USUARIO.github.io/finflow`.

**Opção B — Firebase Hosting** (recomendado, mesma conta do banco)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # escolha o projeto criado no passo 1, pasta pública = "." 
firebase deploy
```

Importante: como é PWA, câmera e microfone só funcionam em **HTTPS** — as duas opções acima já servem em HTTPS automaticamente.

### 5. Ícones do app
Os nomes `icons/icon-192.png` e `icons/icon-512.png` estão referenciados no `manifest.json` mas os arquivos ainda não existem — adicione dois PNGs quadrados (192×192 e 512×512) nessa pasta com a logo que preferir.

## Limites do plano gratuito a ficar de olho

- **Firestore (Spark)**: 1 GiB armazenado, 50 mil leituras/dia, 20 mil escritas/dia — tranquilo para uso pessoal e MVP com poucos usuários.
- **Firebase Hosting (Spark)**: 10 GB de transferência/mês.
- **Tesseract.js**: roda inteiramente no navegador do usuário, sem limite de chamadas nem custo — mas é mais lento e menos preciso que uma API paga de OCR.
- **Web Speech API**: gratuita, mas depende do navegador (funciona bem em Chrome/Edge; Safari tem suporte parcial).

Se o projeto crescer muito, o próximo passo natural é o plano **Blaze** do Firebase (paga só o que exceder o gratuito) — mas para validar a ideia, o Spark resolve.

## Próximos passos sugeridos

- Editar/excluir lançamentos (hoje só é possível criar)
- Categorização automática de gastos (mercado, transporte, lazer...)
- Gráfico de gastos por categoria
- Melhorar a interpretação de voz para frases mais variadas
- Nota legal: se for oferecer dicas de investimento mais específicas no futuro, vale checar as exigências da CVM para conteúdo financeiro
