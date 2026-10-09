# Validação do ambiente Docker

Data da execução: 09/10/2026. Auditoria somente do ambiente de desenvolvimento local.

## Repositórios e serviços

- Frontend: `supermercado-voce-no-coracao-da-gente-frontend` (Angular 22.2.2), neste repositório. Não há Dockerfile nem Compose; as rotas estão vazias e a tela ainda é o placeholder gerado pelo Angular.
- Backend: `supermercado-api`, em `Documents/dev/back/supermercado-api`, repositório Git separado, sem alterações locais. Spring Boot 3.5.16 / Java 21. Contém migrations Flyway, catálogo, usuários, carrinho, pedidos, pagamento simulado e configuração do Keycloak.
- O Compose do backend executa API, PostgreSQL, Keycloak, RabbitMQ e Redis. O projeto `localstack_localstack-docker-desktop-desktop-extension` também estava ativo no host, mas é um Compose independente e não aparece como dependência do e-commerce.
- Outros repositórios Docker encontrados no diretório de desenvolvimento pertencem a projetos separados; não estão declarados nem conectados à rede `supermercado-api_local_network`.

## Configuração e endereços

Compose: `/Users/samirandrade/Documents/dev/back/supermercado-api/docker-compose.yaml`.

| Serviço | Imagem | Porta no host → container | Rede/alias Docker | Persistência |
| --- | --- | --- | --- | --- |
| API | imagem local `supermercado-api-api` | `8080 → 8080` | `supermercado-api_local_network` / `api` | sem volume |
| PostgreSQL | `postgres:16-alpine` | `5432 → 5432` | mesma rede / `postgres` | `supermercado-api_postgres_data` em `/var/lib/postgresql/data` |
| Keycloak | `quay.io/keycloak/keycloak:26.7.5` | `7080 → 7080` | mesma rede / `keycloak` | bind read-only de `keycloak/realm` |
| RabbitMQ | `rabbitmq:3-management-alpine` | `5673 → 5672`, console `15673 → 15672` | mesma rede / `rabbitmq` | volume Docker anônimo em `/var/lib/rabbitmq` |
| Redis | `redis:7-alpine` | `6380 → 6379` | mesma rede / `redis` | volume Docker anônimo em `/data` |

A rede é bridge. A API espera PostgreSQL, RabbitMQ, Keycloak e Redis saudáveis antes de iniciar. Dentro dos containers, as conexões usam os aliases Docker (`postgres:5432`, `rabbitmq:5672`, `keycloak:7080`, `redis:6379`); não usam `localhost` para esses serviços. A URI do emissor OIDC é `http://localhost:7080/realms/supermercado`, que coincide com o `iss` anunciado ao cliente host; o endereço interno de JWK da API usa `keycloak:7080`.

O Compose fornece valores padrão voltados a desenvolvimento para credenciais e aceita substituições por variáveis de ambiente. Os valores não são reproduzidos aqui. O frontend não tem configuração de URL da API nem execução em container neste momento. CORS do backend permite `http://localhost:4200`, origem que corresponde ao servidor Angular de desenvolvimento descrito no README.

## Comandos e estado observado

Comandos/consultas executados (nenhum deles recriou ou removeu recursos):

- `docker compose ls --all`
- `docker ps -a --no-trunc`
- `docker inspect --format ... supermercado-api supermercado-postgres supermercado-keycloak supermercado-rabbitmq supermercado-redis`
- Consultas `docker exec` somente de leitura: `psql` para histórico Flyway/contagens, `redis-cli ping`, `rabbitmq-diagnostics -q ping`, `rabbitmqctl list_queues` e health endpoint interno do Keycloak.
- `docker logs --tail 250 supermercado-api` com saída limitada a WARN/ERROR e sanitizada.
- Requisições HTTP a readiness, catálogo, OIDC, CORS e endpoints autenticados, descritas abaixo.

| Container | Estado/healthcheck | Reinícios | Observação |
| --- | --- | ---: | --- |
| `supermercado-api` | running / healthy | 0 | readiness HTTP também retornou UP |
| `supermercado-postgres` | running / healthy | 0 | migrations V1 e V2 com `success=true`; 27 produtos e 5 categorias |
| `supermercado-keycloak` | running / healthy | 0 | `/health/ready` interno retornou UP |
| `supermercado-rabbitmq` | running / healthy | 0 | diagnóstico ping passou; filas de pagamento com consumidores ativos |
| `supermercado-redis` | running / healthy | 0 | `redis-cli ping` retornou `PONG` |

Não foram vistos erros ou falhas de inicialização nos logs recentes da API. Foram encontrados dois WARNs do SpringDoc informando que Swagger UI e `/v3/api-docs` ficam habilitados por padrão; não impediram a execução. A fila `payment.requested` tinha 1 consumidor, `payment.approved` tinha 1 consumidor e a dead-letter `payment.dlq` estava vazia na consulta.

## Requisições e fluxos executados

URLs do host efetivamente usadas: API `http://localhost:8080`, Keycloak `http://localhost:7080`, frontend de desenvolvimento esperado `http://localhost:4200`. RabbitMQ e PostgreSQL são publicados, respectivamente, nas portas 5673 e 5432; Redis na 6380. As portas internas Docker são diferentes conforme a tabela.

| Verificação | Resultado |
| --- | --- |
| `GET /actuator/health/readiness` | HTTP 200, `{"status":"UP"}`; readiness inclui estado da aplicação, DB e RabbitMQ |
| `GET /api/products?page=0&size=3` | HTTP 200; resposta paginada com produtos e categoria |
| `GET /realms/supermercado/.well-known/openid-configuration` no Keycloak | HTTP 200; issuer e token endpoint anunciados em `localhost:7080` |
| Preflight `OPTIONS /api/products` com origem `http://localhost:4200` | HTTP 200; `Access-Control-Allow-Origin` e métodos esperados |
| `GET /api/cart` e `GET /api/users/me` sem token | HTTP 401 em ambos |
| Cadastro de conta isolada de auditoria `POST /api/users` | HTTP 201 |
| Login no token endpoint OIDC (`supermercado-frontend`) | HTTP 200; token usado apenas nas chamadas seguintes, não registrado |
| Perfil, catálogo, carrinho (consultar/adicionar/alterar/remover) | HTTP 200 em cada operação autenticada |
| `POST /api/orders/checkout` | HTTP 201; pedido criado como `PAYMENT_PENDING`, total de R$ 3,49 |
| Consulta assíncrona do pedido | pagamento avançou para `APPROVED`; pedido apareceu em `GET /api/orders` |
| Carrinho após checkout | vazio, conforme esperado |

O fluxo gravou uma conta e um pedido de teste no banco/Keycloak existentes. Nenhum dado foi apagado. O checkout usa o gateway simulado; não houve cobrança financeira real.

## Limitações e pendências

- Não foi feita inicialização limpa: reconstruir/recriar containers pode interromper o ambiente e o PostgreSQL usa volume persistente existente. Nenhum volume foi removido e `docker compose down -v` não foi executado.
- Não foram executados `mvn test`, build/testes Angular nem testes de navegador. A API foi validada por requisições reais ao ambiente ativo; o frontend atual ainda é um esqueleto sem telas, serviços HTTP, login ou fluxos de e-commerce para exercitar ponta a ponta pelo navegador.
- Não foram testados recusa de pagamento, estoque insuficiente ou autorização entre dois usuários. O caminho de processamento assíncrono aprovado foi confirmado. Os testes de recusa/estoque exigiriam criar pedidos ou manipular dados adicionais no estado persistente.
- O Compose fixa credenciais padrão de desenvolvimento quando variáveis de substituição não são fornecidas. Não são credenciais de produção; antes de qualquer uso compartilhado, configurar valores locais protegidos sem incluí-los em commits.
- Não houve correção de serviço necessária nesta auditoria; por isso, nenhum backend foi alterado. O único arquivo novo é este relatório no repositório frontend.
