// 1. Vá em https://console.firebase.google.com, crie um projeto (grátis).
// 2. Em "Configurações do projeto" > "Seus apps" > "Web", crie um app e copie os valores abaixo.
// 3. Ative no console: Authentication (método E-mail/senha) e Firestore Database (modo produção).
const firebaseConfig = {
  apiKey: "AIzaSyCPgppEnwBCxbc1wBUAwKVj3AXFb8HY8m4",
  authDomain: "voify-b766d.firebaseapp.com",
  projectId: "voify-b766d",
  storageBucket: "voify-b766d.firebasestorage.app",
  messagingSenderId: "1036770625586",
  appId: "1:1036770625586:web:e22266c52fc31c4003942b"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
