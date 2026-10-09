# Mercadinho

Frontend Angular do e-commerce “Mercadinho — você no coração da gente”. O catálogo, detalhes, cadastro, carrinho, checkout simulado e pedidos usam a API do projeto `supermercado-api`.

## Executar localmente

Com a API, o Keycloak, o PostgreSQL, o RabbitMQ e o Redis ativos pelo Compose do backend:

```bash
npm install
npm start
```

Abra `http://localhost:4200` (use `localhost`, conforme as origens permitidas no Keycloak e na API). Os endereços locais estão centralizados em `src/app/core/config.ts`: API em `http://localhost:8080`, Keycloak em `http://localhost:7080`, realm `supermercado` e cliente público `supermercado-frontend`.

O login usa Authorization Code com PKCE, `state` e `nonce`. Tokens ficam apenas em memória, são renovados quando necessário e enviados pelo interceptor apenas à API. O cadastro cria a conta pela API e o login ocorre na página segura do Keycloak.

## Fluxos

- Catálogo público, filtros por texto/categoria e detalhes do produto.
- Cadastro público e autenticação Keycloak.
- Carrinho autenticado com quantidades validadas pelo estoque.
- Checkout cria `PAYMENT_PENDING`; a tela acompanha o processamento e apresenta o estado real retornado pela API.
- Histórico e detalhes consultam somente os pedidos do usuário autenticado.

O backend não fornece imagem nos DTOs de produto; as telas usam ilustrações SVG locais por categoria. O pagamento é simulado pelo backend. O frontend não coleta cartão, endereço ou frete.

## Validar

```bash
npm test -- --watch=false
npm run build
```

Para estado e testes de integração do Compose, consulte [`docs/validacao-docker.md`](docs/validacao-docker.md).
