# ApexFit Commerce API

API REST para produtos, pedidos, avaliações, mensagens de contato e pagamentos com o EMIS.

## Estrutura

- `db/schema.sql`: esquema MySQL.
- `db/seed.sql`: categorias e produtos iniciais.
- `src/routes`: endpoints HTTP.
- `src/repositories`: acesso a dados e transações.
- `src/services/emis.js`: cliente HTTP do EMIS.
- `src/payments/emisWebhook.js`: validação de webhooks.
- `test`: testes smoke da API.

## Instalação

```bash
npm install
cp .env.example .env
```

Preencha `EMIS_API_KEY`, `EMIS_MERCHANT_ID` e `EMIS_WEBHOOK_SECRET` com as credenciais fornecidas pelo EMIS. A URL do webhook deve ser registrada como `http://seu-dominio/api/payments/webhooks/emis`.

## Banco

```bash
mysql -u root -p < db/schema.sql
mysql -u root -p < db/seed.sql
```

Para uma base já existente, aplique a migration aditiva sem apagar tabelas nem registos e crie a primeira conta administrativa:

```bash
npm run db:migrate
npm run db:admin:create
```

Antes, configure `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env` (palavra-passe com pelo menos 12 caracteres). A tabela `admins` guarda apenas `password_hash` (scrypt), nunca a palavra-passe em texto simples. O comando de criação não substitui uma conta já existente com o mesmo e-mail.

A migration 003 cria preferências, campanhas publicitárias e tabelas de localidades, acrescenta credenciais de cliente e habilita reservas. Execute `npm run db:migrate` também numa instalação nova depois de criar o esquema.

## Execução

```bash
npm start
```

Antes de iniciar, crie `.env` a partir de `.env.example` e configure os dados reais do MySQL, um `JWT_SECRET` longo e as credenciais administrativas; não use os valores de exemplo sem os substituir. Inicie a API com `npm start` numa janela de terminal e mantenha-a aberta. Confirme que está ativa em `http://localhost:3000/health`; a resposta deve indicar `{"status":"ok","service":"apexfit-api"}`. O XAMPP serve a loja, mas não inicia esta API Node automaticamente.

Abra a loja pelo servidor web (por exemplo, `http://localhost/E-commerce/` no XAMPP), não diretamente como ficheiro `file://`. Em desenvolvimento, a API permite origens locais como `localhost` e `127.0.0.1`; em produção, configure `CORS_ORIGIN` com as origens exatas permitidas. Use o botão Admin para abrir `admin.html`. O token administrativo expira após oito horas e fica guardado na sessão do separador; o login permite até dez tentativas por 15 minutos.

### Publicação no GitHub Pages

O GitHub Pages publica apenas os ficheiros estáticos do site; não executa o servidor Node nem disponibiliza a API ou o MySQL. Para registo, login, catálogo e restantes funções ligadas ao banco funcionarem no telefone, publique a API Node e a base de dados num serviço compatível e acessível por HTTPS. Depois, configure `window.APEXFIT_API_URL` em `src/api-config.js` com a URL base da API, sem uma barra no fim (por exemplo, `https://api.seudominio.com`), e publique novamente o site. Para este repositório, a origem CORS é `https://gomesrodrigues5.github.io` — sem `/e-commerce/` — e deve estar incluída em `CORS_ORIGIN` no ambiente do servidor da API. Confirme que o endpoint `/health` da API responde com JSON. Não use a URL do GitHub Pages nem `localhost` como URL da API publicada: no primeiro caso o site devolve HTML, e num telefone `localhost` aponta para o próprio telefone.

O painel permite criar, editar e desativar produtos, carregar imagens PNG/JPEG/WEBP/GIF até 5 MB, gerir campanhas publicitárias com datas de publicação e desativação automática, atualizar estados de encomendas, consultar vendas agregadas e ler mensagens. Os ficheiros são guardados em `public/uploads`; mantenha essa pasta em armazenamento persistente no servidor. Todos os endpoints administrativos exigem token. A primeira conta é criada por `npm run db:admin:create`, usando as credenciais configuradas no servidor.

## Contas, compras e reservas

Os clientes podem criar conta com nome, e-mail, telefone, província, município, palavra-passe e categorias de interesse. As palavras-passe são guardadas com scrypt. Comprar, pagar, reservar e publicar avaliações exige um token de cliente; os dados de cliente enviados pelo navegador não são usados para identificar o comprador. As reservas bloqueiam stock por 24 horas e o servidor devolve o stock quando expiram.

O formulário carrega as províncias e os municípios diretamente do ficheiro local `db/seeds/angola-locations.json`, sem consultar os endpoints da API de localidades; ao escolher uma província, a combobox de municípios é preenchida de imediato. O registo continua a ser validado pelo servidor. A lista fornecida atualmente contém 163 municípios e é parcial; não inclui os 326 municípios da divisão de 2024. Complete/valide o ficheiro antes de considerar todos os municípios disponíveis. As migrations e o servidor também sincronizam os dados locais na base de dados. Para atualização automática a partir de uma fonte oficial/confiável, configure `ANGOLA_LOCATIONS_URL` no `.env` com uma URL que devolva JSON neste formato:

```json
{
  "provinces": [
    { "name": "Bengo", "municipalities": ["Ambriz", "Dande"] }
  ]
}
```

A fonte tem de incluir as 21 províncias atuais, com pelo menos um município por província. O servidor importa a lista ao iniciar e a cada 24 horas, substituindo a lista anterior numa transação; se a fonte falhar, conserva os últimos dados. A lista de municípios é apresentada num seletor dependente da província, e o servidor só aceita um município registado para essa província. Confirme que a fonte inclui todos os municípios da divisão administrativa de 2024 antes de a configurar.

As preferências selecionadas no registo alimentam a área “Recomendado para si”. Quando `AI_API_KEY` está configurada, a IA compatível com OpenAI seleciona produtos do catálogo atual; sem IA disponível, a loja usa as categorias escolhidas e as novidades como alternativa. As campanhas publicitárias ativas são apresentadas automaticamente apenas dentro do período agendado.

O formulário de contacto guarda as mensagens no MySQL, envia uma notificação para a loja e uma resposta automática ao cliente quando o SMTP está configurado. Defina `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER` e `SMTP_PASSWORD` no `.env`. O remetente padrão é `ribeiro.gomes@gcgreen.ao`; `CONTACT_TO` também aponta para esse endereço por padrão. Confirme com o fornecedor SMTP que a conta autenticada pode enviar usando esse remetente.

Para respostas personalizadas por IA, configure `AI_API_KEY`, `AI_BASE_URL` e `AI_MODEL`. O serviço usa uma API compatível com OpenAI Chat Completions, envia nome, e-mail, assunto, mensagem e uma consulta do catálogo ativo feita em cada contacto (até 80 produtos), com timeout de 12 segundos. Assim, a resposta usa os dados atuais do banco; isto não treina nem atualiza continuamente o modelo. Se a IA estiver ausente ou falhar, o cliente recebe uma confirmação fixa; sem SMTP, a mensagem continua guardada e nenhum e-mail é enviado. A IA é instruída a não inventar preços, stock, prazos ou estado de encomendas.

## Endpoints

- `GET /health`
- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/products/:id/reviews`
- `POST /api/orders`
- `POST /api/orders/reservations` (autenticado como cliente)
- `GET /api/orders/track/:orderNumber` (autenticado como cliente e limitado aos próprios pedidos)
- `POST /api/orders/:id/payments`
- `POST /api/reviews`
- `POST /api/contact`
- `GET /api/dashboard` (autenticado)
- `POST /api/admin/login`
- `GET /api/admin/session` (autenticado)
- `GET /api/admin/products` (autenticado)
- `POST /api/admin/products` (autenticado)
- `PUT /api/admin/products/:id` (autenticado)
- `DELETE /api/admin/products/:id` (autenticado; desativação lógica)
- `GET /api/admin/orders` e `PATCH /api/admin/orders/:id/status` (autenticados)
- `GET /api/admin/messages` (autenticado)
- `GET /api/customers/locations/provinces`
- `GET /api/customers/locations/provinces/:id/municipalities`
- `POST /api/customers/register`
- `POST /api/customers/login`
- `GET /api/customers/session` (autenticado como cliente)
- `GET /api/customers/orders` (autenticado como cliente)
- `PUT /api/customers/preferences` e `GET /api/customers/recommendations` (autenticados como cliente)
- `GET /api/advertisements`
- `GET/POST/PUT/DELETE /api/admin/advertisements` (autenticados)
- `POST /api/admin/uploads` (autenticado; multipart `image`)
- `POST /api/payments/webhooks/emis`

O catálogo público carrega todas as páginas de produtos ativos (100 por pedido à API) e mostra nome, categoria, descrição, preço, stock e imagem. Produtos desativados continuam visíveis apenas no painel administrativo. A API aceita `limit` até 100 e `page`; a pesquisa pode usar nome, descrição e categoria.

## Segurança

- Os preços são obtidos do banco dentro da transação.
- O estoque é reduzido atomicamente.
- A assinatura do webhook usa HMAC-SHA256.
- O endpoint de pagamento está protegido por rate limiting.
- Credenciais devem permanecer no arquivo `.env` e nunca serem commitadas.

## Limitações

A API usa MySQL e requer a configuração real do EMIS. O contrato de criação de pagamento pode variar conforme a documentação da versão da API do EMIS; o adaptador está isolado em `src/services/emis.js`.

O adaptador assume `POST /api/v1/payments`, autenticação Bearer, `X-Merchant-ID`, os campos de retorno e os cabeçalhos de assinatura documentados no código. Confirme estes detalhes com a documentação e credenciais de sandbox da EMIS antes de produção; a API não deve ser considerada validada contra o gateway real apenas pelos testes locais.
