# Arquitetura de Autenticação, Sessão e Segurança

## Visão geral

A arquitetura foi projetada para separar as responsabilidades de autenticação, gerenciamento operacional de sessões, auditoria e segurança, evitando que essas responsabilidades fiquem concentradas em um único componente.

O ecossistema é composto por dois **Backend for Frontend (BFFs)**, ambos desenvolvidos em **NestJS**. Cada BFF atende a uma aplicação específica e possui seu próprio **Redis**, utilizado para o armazenamento operacional das sessões e dos tokens associados aos usuários.

A autenticação é realizada pelo **Keycloak**, utilizado como provedor central de identidade. A arquitetura utiliza **Single Sign-On (SSO)**, permitindo que diferentes aplicações integradas ao mesmo ambiente de identidade reconheçam a autenticação já realizada pelo usuário.

O **IAM Service**, desenvolvido em **Spring Boot**, concentra as responsabilidades relacionadas à segurança, auditoria, análise de contexto, gerenciamento centralizado das sessões e processamento de eventos de segurança. Ele não substitui o Keycloak, mas complementa suas funcionalidades com regras e controles específicos da aplicação.

O **Notification Service** é responsável pela entrega de notificações aos usuários, principalmente aquelas originadas de eventos relacionados à segurança.

A comunicação entre os componentes utiliza mecanismos diferentes de acordo com a natureza da operação:

* **HTTP/HTTPS** para operações síncronas que necessitam de resposta imediata;
* **Kafka** para publicação e processamento assíncrono de eventos;
* **RabbitMQ** para envio de comandos direcionados, especialmente comandos de revogação de sessões.

Essa divisão permite separar acontecimentos do sistema, representados por eventos, de solicitações explícitas para execução de ações, representadas por comandos.

---

## Componentes da arquitetura

### BFFs

A arquitetura possui dois BFFs independentes. Cada BFF atende a uma aplicação específica e é responsável pelo gerenciamento operacional das sessões utilizadas por essa aplicação.

Cada BFF possui:

* um **Redis próprio**, utilizado para armazenamento das sessões e tokens;
* integração com o **Keycloak**;
* publicação de eventos no **Kafka**;
* consumo de comandos provenientes do **RabbitMQ**.

A separação dos Redis proporciona isolamento operacional entre os BFFs. Dessa forma, cada aplicação mantém seu próprio armazenamento de sessões, reduzindo o acoplamento entre elas e evitando que o gerenciamento operacional de uma aplicação dependa diretamente do armazenamento de outra.

O frontend não recebe diretamente os tokens de acesso ou refresh. Após a autenticação, os tokens permanecem sob controle do BFF, enquanto o navegador utiliza uma sessão representada por um cookie.

O BFF utiliza esse identificador para localizar a sessão correspondente no seu Redis e recuperar os tokens necessários para realizar as operações autenticadas.

O BFF permanece responsável pelo ciclo de vida operacional dos tokens e da sessão, incluindo sua obtenção, armazenamento, recuperação, renovação, expiração e remoção.

---

## Redis

Cada BFF possui uma instância própria de Redis.

O Redis funciona como armazenamento operacional das informações necessárias para que o BFF processe as requisições autenticadas.


O Redis representa o **estado operacional** das sessões. Ele não é utilizado como fonte permanente para histórico e auditoria.

As informações que precisam permanecer disponíveis após a expiração ou remoção de uma sessão são persistidas no **PostgreSQL**, sob responsabilidade do IAM Service.

Essa separação permite que o Redis seja otimizado para operações rápidas de leitura e escrita durante o processamento das requisições, enquanto o banco de dados mantém as informações necessárias para histórico, auditoria e análise posterior.

---

## Keycloak

O **Keycloak** é responsável pela autenticação e pelo gerenciamento da identidade dos usuários.

Os BFFs utilizam o Keycloak como provedor de identidade e como autoridade responsável pela emissão dos tokens necessários para acessar recursos protegidos.

A arquitetura utiliza **OpenID Connect (OIDC)** para a autenticação. O BFF atua como cliente confidencial do Keycloak e mantém os tokens fora do ambiente do navegador.

O fluxo de autenticação utiliza **Authorization Code Flow com PKCE**, permitindo que o processo de autenticação seja realizado de maneira segura sem expor os tokens ao frontend.

Além da autenticação, o Keycloak fornece recursos como:

* Single Sign-On;
* gerenciamento de usuários;
* grupos e papéis;
* integração com APIs administrativas;
* emissão e validação de tokens.

O Keycloak, portanto, permanece responsável pela **identidade e autenticação**, enquanto o IAM Service implementa controles de segurança e regras adicionais específicas do ecossistema.

---

## Single Sign-On

O **Single Sign-On (SSO)** permite que diferentes aplicações compartilhem a autenticação fornecida pelo mesmo provedor de identidade.

O usuário possui uma identidade centralizada no Keycloak, enquanto cada BFF mantém o controle operacional das sessões utilizadas pela sua própria aplicação.

Dessa forma, a arquitetura combina:

**identidade centralizada + SSO + isolamento operacional das sessões.**

Uma aplicação não precisa manter uma sessão global compartilhada com as demais aplicações. Cada BFF continua responsável pela sessão correspondente à sua aplicação.

---

## IAM Service

O **IAM Service** é um microsserviço desenvolvido em **Spring Boot** responsável pelas funcionalidades centralizadas de segurança e gerenciamento de identidade.

Entre suas responsabilidades estão:

* auditoria de eventos;
* gerenciamento centralizado das sessões;
* análise de contexto de acesso;
* identificação de atividades suspeitas;
* aplicação de regras de segurança;
* processamento dos eventos publicados pelos BFFs;
* integração com o Keycloak para operações administrativas;
* emissão de comandos de revogação de sessões.

O IAM Service não acessa diretamente os Redis dos BFFs.

Essa separação é importante porque mantém o Redis como responsabilidade operacional do respectivo BFF. O IAM Service trabalha com as informações persistidas e com os eventos recebidos dos BFFs e, quando necessário, solicita que o BFF execute uma alteração em sua própria sessão.

---

## Notification Service

O **Notification Service** é responsável pelo envio de notificações relacionadas aos eventos processados pelo ecossistema de segurança.

Por exemplo, quando o IAM Service identifica um evento que deve ser comunicado ao usuário, pode encaminhar a solicitação de notificação para esse serviço.

A responsabilidade pelo envio da comunicação é separada da lógica de análise e decisão de segurança.

Dessa forma, o IAM Service permanece concentrado nas regras de segurança, enquanto o Notification Service cuida da entrega das notificações.

---

## Kafka

O **Kafka** é utilizado como mecanismo de comunicação assíncrona baseado em eventos.

Os BFFs atuam como **produtores** de eventos relacionados às atividades de autenticação e sessão.

Por exemplo:

```text
BFF
 │
 ├── session.created
 ├── session.refreshed
 └── session.expired
        │
        ▼
      Kafka
        │
        ▼
   IAM Service
```

Os eventos representam acontecimentos que já ocorreram no BFF.

Por exemplo, quando uma sessão é criada, o BFF pode publicar um evento informando que a sessão foi criada. O IAM Service pode consumir esse evento posteriormente para realizar auditoria, atualizar informações persistentes ou executar análises de segurança.

O processamento do evento não precisa bloquear a requisição original.

O Kafka também fornece retenção dos eventos, permitindo que determinados registros sejam posteriormente reprocessados de acordo com as necessidades do sistema.

É importante diferenciar **eventos** de **comandos**:

* evento: informa que algo aconteceu;
* comando: solicita que alguma ação seja executada.

Na arquitetura, o Kafka é utilizado para eventos. Os comandos direcionados aos BFFs são tratados pelo RabbitMQ.

---

## RabbitMQ

O **RabbitMQ** é utilizado principalmente para comunicação baseada em **comandos direcionados**.

Um dos principais casos de uso é a revogação de uma sessão.

Quando o IAM Service determina que uma determinada sessão deve ser revogada, ele identifica qual BFF é responsável por aquela sessão e envia um comando para esse BFF através do RabbitMQ.

O BFF recebe o comando e executa a alteração diretamente no seu próprio Redis.

```text
                 IAM Service
                     │
                     │ comando de revogação
                     ▼
                 RabbitMQ
                     │
                     ▼
                  BFF Web
                     │
                     ▼
                 Redis Web
                     │
                     ▼
              Remove a sessão
```


O IAM Service não precisa acessar diretamente nenhum Redis.

Além de preservar o encapsulamento dos BFFs, esse modelo evita que um BFF precise receber ou processar comandos destinados a sessões pertencentes a outra aplicação e que as aplicações necessitem uma de conhecer as outras.

---

## Persistência

O **PostgreSQL** é utilizado para armazenar informações que precisam sobreviver ao ciclo de vida do Redis.

Entre essas informações podem estar:

* registros de auditoria;
* sessões;
* usuários;
* dispositivos;
* eventos de autenticação;
* informações de contexto;
* registros relacionados à segurança;
* histórico de atividades.

O Redis e o PostgreSQL possuem, portanto, funções diferentes.

O **Redis** mantém o estado operacional necessário para o funcionamento imediato dos BFFs.

O **PostgreSQL** mantém as informações persistentes necessárias para histórico, auditoria, gestão e análise.

Os Access Tokens e Refresh Tokens utilizados operacionalmente pelos BFFs permanecem no Redis de cada BFF e não precisam ser tratados como dados permanentes de auditoria no PostgreSQL.

---

## Separação de responsabilidades

A arquitetura procura manter uma separação clara entre identidade, sessão operacional e segurança.

### BFF

O BFF é responsável pela aplicação que atende e pelo gerenciamento operacional das sessões dessa aplicação.

Ele controla:

* sessão;
* tokens;
* Redis;
* renovação;
* expiração;
* execução dos comandos recebidos.

### Keycloak

O Keycloak é responsável pela identidade e autenticação.

Ele fornece:

* autenticação;
* SSO;
* emissão de tokens;
* usuários;
* grupos;
* papéis.

### IAM Service

O IAM Service concentra a inteligência de segurança.

Ele é responsável por:

* auditoria;
* análise de contexto;
* regras de segurança;
* análise de eventos;
* visão centralizada das sessões;
* decisões de revogação;
* integração administrativa com o Keycloak.

### Kafka

O Kafka transporta **eventos**.

Os BFFs publicam acontecimentos relacionados à autenticação e às sessões, e o IAM Service os processa de forma assíncrona.

### RabbitMQ

O RabbitMQ transporta **comandos direcionados**.

Quando o IAM Service precisa que um BFF execute uma ação, como revogar uma sessão, o comando é encaminhado ao BFF responsável.

---

## Princípios da arquitetura

A arquitetura combina alguns princípios fundamentais.

**Identidade centralizada:** o Keycloak concentra a autenticação e permite que as aplicações compartilhem a identidade por meio do SSO.

**Sessões isoladas:** cada BFF possui seu próprio Redis e controla operacionalmente as sessões da aplicação que atende.

**Tokens fora do frontend:** Access Tokens e Refresh Tokens permanecem sob controle do BFF, enquanto o frontend utiliza uma sessão representada por cookie.

**Segurança centralizada:** o IAM Service concentra auditoria, análise de contexto, regras de segurança e decisões que precisam considerar o ecossistema como um todo.

**BFF sem concentração de responsabilidades:** o BFF não precisa implementar toda a inteligência de segurança. Ele executa as operações necessárias para sua própria aplicação e mantém o controle operacional das suas sessões.

**Eventos desacoplados:** o Kafka permite que os acontecimentos relacionados à autenticação e às sessões sejam processados de forma assíncrona.

**Comandos direcionados:** o RabbitMQ permite que ações específicas, como a revogação de uma sessão, sejam encaminhadas diretamente ao BFF responsável.

**Encapsulamento do armazenamento:** nenhum BFF acessa o Redis de outro BFF e o IAM Service não acessa diretamente os Redis.

Essa divisão permite combinar **SSO centralizado**, **isolamento das sessões**, **proteção dos tokens**, **processamento assíncrono de eventos** e **controle centralizado de segurança**, mantendo cada componente responsável por uma parte específica do ciclo de autenticação e segurança.
