# AcademicSBT — Explicação Detalhada

## Visão Geral

`AcademicSBT` é um **Soulbound Token (SBT)** acadêmico. Um SBT é um NFT que **não pode ser transferido** após emitido — ele fica "preso na alma" do dono. O propósito aqui é representar credenciais acadêmicas (diplomas, certificados, etc.) de forma verificável na blockchain.

> **Importante:** Este não é um contrato Solana. É um contrato **Ethereum/EVM** escrito em **Solidity**. Solana usa Rust (ou Anchor framework).

---

## Imports e Herança

```solidity
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract AcademicSBT is ERC721, ERC721Enumerable, AccessControl {
```

O contrato herda três contratos da OpenZeppelin:

- **ERC721**: padrão de NFT. Cada token tem um ID único e um dono.
- **ERC721Enumerable**: extensão que mantém listas de tokens por titular, permitindo consulta direta on-chain (`tokenOfOwnerByIndex`).
- **AccessControl**: sistema de papéis (roles) para controlar quem pode chamar quais funções.

Imports nomeados (`{X}`) são preferidos a imports simples — deixam explícito o que está sendo usado de cada arquivo.

---

## Enum `CredentialType`

```solidity
enum CredentialType {
    BACHELOR,         // Bacharelado
    LICENTIATE,       // Licenciatura
    TECHNOLOGIST,     // Tecnólogo
    POSTGRAD_LATO,    // Pós-graduação Lato Sensu (Especialização / MBA)
    POSTGRAD_STRICTO, // Pós-graduação Stricto Sensu (Mestrado / Doutorado)
    SEQUENTIAL        // Estudos sequenciais
}
```

Define os tipos de credencial de forma controlada. Usar `enum` em vez de `string` livre evita inconsistências (`"diploma"` vs `"Diploma"` vs `"DIPLOMA"`) e é mais eficiente em gas. O tipo está declarado mas `credentialType` na struct ainda usa `string` — extensão futura pode migrar para o enum.

---

## Variáveis e Constantes

### `ISSUER_ROLE`

```solidity
bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
```

Identificador único para o papel de "emissor". Hash keccak256 da string `"ISSUER_ROLE"`. Qualquer endereço com esse papel pode emitir e revogar credenciais.

---

### `_baseTokenUri`

```solidity
string private _baseTokenUri;
```

URL base para os metadados dos tokens (ex: `"https://api.universidade.edu.br/credentials/"`). Configurada no deploy e atualizável pelo admin. Usada pelo `tokenURI` para montar a URL completa de cada token.

---

### `struct AcademicCredential`

```solidity
struct AcademicCredential {
    bytes32 hashVerifiableCredential;
    uint256 issuedAt;
    uint256 revokedAt;
    bool revoked;
    string credentialType;
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `hashVerifiableCredential` | `bytes32` | Hash do documento W3C Verifiable Credential off-chain. Âncora criptográfica entre o documento e o token. |
| `issuedAt` | `uint256` | Timestamp Unix da emissão (`block.timestamp`). |
| `revokedAt` | `uint256` | Timestamp Unix da revogação. `0` enquanto não revogado. |
| `revoked` | `bool` | `true` se a credencial foi revogada. |
| `credentialType` | `string` | Tipo da credencial (ex: `"Diploma"`). |

---

### `_credentials`

```solidity
mapping(uint256 => AcademicCredential) private _credentials;
```

Mapa de `tokenId → AcademicCredential`. Acesso externo via `getCredential()`.

---

### `_vcHashUsed`

```solidity
mapping(bytes32 => bool) private _vcHashUsed;
```

Controla hashes já utilizados. Impede emitir a mesma credencial duas vezes — tentativas com `vcHash` duplicado são revertidas no `mint`.

---

### `_nextTokenId`

```solidity
uint256 private _nextTokenId = 1;
```

Contador auto-incremental dos IDs de token. Começa em `1` (não em `0`) para evitar ambiguidade com valores não inicializados.

---

## Eventos

Eventos são logs imutáveis gravados na blockchain. Sistemas externos (front-ends, indexadores) escutam esses eventos para reconstruir histórico eficientemente sem precisar iterar todos os tokens.

Os campos `indexed` permitem filtragem direta: `getLogs({ holder: "0xABC..." })`.

```solidity
event Locked(uint256 tokenId);      // ERC-5192: token travado
event Unlocked(uint256 tokenId);    // ERC-5192: token destravado

event CredentialIssued(
    uint256 indexed tokenId,
    address indexed holder,
    bytes32 vcHash,
    string  vcType
);

event CredentialRevoked(
    uint256 indexed tokenId,
    address indexed holder,
    string  reason
);
```

---

## Constructor

```solidity
constructor(string memory baseURI) ERC721("Academic Credential", "ACAD") {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(ISSUER_ROLE, msg.sender);
    _baseTokenUri = baseURI;
}
```

Executado uma única vez no deploy. Recebe a URL base como parâmetro — tornando o contrato reutilizável por diferentes instituições. Concede `DEFAULT_ADMIN_ROLE` e `ISSUER_ROLE` ao deployer.

---

## Funções

### `locked(uint256 tokenId)`

```solidity
function locked(uint256 tokenId) external view returns (bool) {
    _requireOwned(tokenId);
    return _credentials[tokenId].revoked;
}
```

Parte da interface **ERC-5192**. Retorna `true` enquanto a credencial é válida (não revogada), `false` após revogação. Deriva o valor diretamente do campo `revoked` — sem mapping auxiliar separado.

---

### `_increaseBalance(...)`

```solidity
function _increaseBalance(address account, uint128 value)
    internal override(ERC721, ERC721Enumerable)
{
    super._increaseBalance(account, value);
}
```

Override obrigatório por herança múltipla. Tanto `ERC721` quanto `ERC721Enumerable` declaram essa função — o Solidity exige resolução explícita. `super` delega para `ERC721Enumerable` (que atualiza as listas internas e chama `ERC721`).

---

### `supportsInterface(bytes4 interfaceId)`

```solidity
function supportsInterface(bytes4 interfaceId)
    public view override(ERC721, ERC721Enumerable, AccessControl)
    returns (bool)
{
    return
        interfaceId == 0xb45a3c0e || // ERC-5192
        super.supportsInterface(interfaceId);
}
```

Introspecção de interface (ERC-165). Responde `true` para ERC-5192 (Soulbound), ERC-721, ERC-721Enumerable e AccessControl. Override triplo necessário pela herança múltipla.

---

### `_baseURI()`

```solidity
function _baseURI() internal view virtual override returns (string memory) {
    return _baseTokenUri;
}
```

Override interno do ERC721. Retorna a URL base armazenada em `_baseTokenUri`. Chamada internamente por `tokenURI`.

---

### `setBaseURI(string calldata newBaseTokenURI)`

```solidity
function setBaseURI(string calldata newBaseTokenURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _baseTokenUri = newBaseTokenURI;
}
```

Permite ao admin atualizar a URL base caso o servidor mude de endereço. Só `DEFAULT_ADMIN_ROLE` pode chamar.

---

### `tokenURI(uint256 tokenId)`

```solidity
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    _requireOwned(tokenId);
    return string.concat(_baseURI(), Strings.toString(tokenId));
}
```

Retorna a URL dos metadados do token (ex: `"https://api.universidade.edu.br/credentials/42"`). Esse endpoint deve retornar um JSON no padrão ERC-721 Metadata com nome, imagem e atributos. Os dados pessoais do aluno **não ficam aqui** — o tokenURI expõe apenas informações públicas (tipo, status). Dados completos ficam no documento VC off-chain com o aluno.

---

### `mint(...)`

```solidity
function mint(address to, bytes32 vcHash, string calldata credentialType)
    external onlyRole(ISSUER_ROLE) returns (uint256)
```

Cria uma nova credencial. Só `ISSUER_ROLE` pode chamar.

**Fluxo:**
1. Valida `to != address(0)` e `vcHash != bytes32(0)`.
2. Verifica que `vcHash` não foi usado antes (`_vcHashUsed`).
3. Incrementa `_nextTokenId` e obtém o novo ID.
4. `_safeMint`: cria o NFT. Se `to` for um contrato, verifica se sabe receber ERC721.
5. Armazena `AcademicCredential` com `revoked = false` e `revokedAt = 0`.
6. Marca `_vcHashUsed[vcHash] = true`.
7. Emite `CredentialIssued` e `Locked`.

---

### `revoke(uint256 tokenId, string calldata reason)`

```solidity
function revoke(uint256 tokenId, string calldata reason)
    external onlyRole(ISSUER_ROLE)
```

Invalida uma credencial. Só `ISSUER_ROLE` pode chamar.

**Fluxo:**
1. Garante que o token existe e não foi revogado antes.
2. Marca `_credentials[tokenId].revoked = true`.
3. Emite `Unlocked` e `CredentialRevoked`.

> O token **não é destruído** — continua na carteira do aluno com `revoked = true`. Qualquer verificador que chamar `getCredential` verá o status real.

---

### `getCredential(uint256 tokenId)`

```solidity
function getCredential(uint256 tokenId)
    external view
    returns (bytes32 vcHash, uint256 issuedAt, bool revoked, string memory vcType)
```

Leitura pública dos dados de uma credencial. Qualquer pessoa pode chamar — é a função usada por verificadores externos para confirmar autenticidade.

---

### `_update(address to, uint256 tokenId, address auth)`

```solidity
function _update(address to, uint256 tokenId, address auth)
    internal override(ERC721, ERC721Enumerable) returns (address)
{
    address from = _ownerOf(tokenId);
    if (from != address(0) && to != address(0)) {
        require(!_credentials[tokenId].revoked, "AcademicSBT: token soulbound nao transferivel");
    }
    return super._update(to, tokenId, auth);
}
```

Intercepta toda movimentação de token. Bloqueia transferências enquanto a credencial é válida.

| Operação | `from` | `to` | Resultado |
|---|---|---|---|
| Mint | `0x000...` | `0xAluno` | Permitido sempre |
| Transfer | `0xAluno` | `0xOutro` | **Bloqueado** se não revogado |
| Burn | `0xAluno` | `0x000...` | Permitido após revogação |

Override duplo `(ERC721, ERC721Enumerable)` necessário para que o `ERC721Enumerable` também atualize suas listas internas via `super`.

---

## AccessControl — Como funciona

O `AccessControl` armazena permissões na própria storage do contrato:

```
_roles
├── DEFAULT_ADMIN_ROLE → { 0xDeployer: true }
└── ISSUER_ROLE        → { 0xDeployer: true, 0xSecretaria: true }
```

Cada contrato deployado tem storage isolada — dois deploys do mesmo bytecode não compartilham permissões.

### Gerenciando roles após o deploy

```javascript
contract.grantRole(ISSUER_ROLE, "0xSecretaria");   // adicionar
contract.revokeRole(ISSUER_ROLE, "0xCompromitido"); // remover
contract.hasRole(ISSUER_ROLE, "0xAlguem");          // consultar
```

### DEFAULT_ADMIN_ROLE = `0x00`

Valor fixo pela especificação. `keccak256` nunca retorna `0x00`, então não há colisão com roles customizadas. Como `bytes32` tem valor padrão `0x00`, toda role nova automaticamente tem `DEFAULT_ADMIN_ROLE` como admin.

### Mitigações de risco

| Abordagem | Como funciona |
|---|---|
| **Multisig** (produção) | Gnosis Safe com N de M assinaturas |
| **Renunciar ao admin** | `renounceRole(DEFAULT_ADMIN_ROLE, msg.sender)` |
| **Timelock** | Alterações ficam em fila por X horas |

---

## Selective Disclosure — Dados do Aluno

O `tokenURI` é público. Dados pessoais (nome, CPF, curso) **não ficam no contrato** — ficam no documento VC off-chain que o aluno guarda.

```
tokenURI → JSON público → tipo + status (sem dados pessoais)

Verificação:
  1. Aluno apresenta o documento VC completo
  2. Verificador calcula hash do documento
  3. Compara com vcHash on-chain via getCredential()
  4. Confirma revoked == false
  → Credencial válida, sem expor dados na blockchain
```

O aluno controla o que revela — apresenta o documento completo ou apenas campos selecionados. A blockchain confirma que o hash foi registrado e não foi revogado, sem saber o conteúdo.

---

## Padrões Implementados

| Padrão | O que é |
|---|---|
| ERC-721 | NFT padrão com ID único e dono |
| ERC-721 Enumerable | Consulta de tokens por titular on-chain |
| ERC-5192 | Soulbound Token (lock/unlock) |
| ERC-165 | Introspecção de interface |
| W3C VC (off-chain) | `vcHash` aponta para Verifiable Credential fora da chain |
| AccessControl | Controle de acesso baseado em papéis |

---

## Diagrama de Fluxo de Vida de um Token

```
[Deploy]
    → deployer recebe DEFAULT_ADMIN_ROLE + ISSUER_ROLE
    → _baseTokenUri configurado

[grantRole(ISSUER_ROLE, 0xSecretaria)]
    → secretaria pode emitir e revogar

[mint(0xAluno, vcHash, "Diploma")]
    → _nextTokenId++ → tokenId = 1, 2, 3...
    → _vcHashUsed[vcHash] = true (previne duplicata)
    → AcademicCredential gravada: revoked=false, revokedAt=0
    → eventos: CredentialIssued + Locked
    → token na carteira do aluno — não transferível

[revoke(tokenId, "motivo")]
    → _credentials.revoked = true
    → eventos: Unlocked + CredentialRevoked
    → token permanece na carteira, mas inválido para verificação

[tokenURI(tokenId)] → "https://api.universidade.edu.br/credentials/42"
    → servidor retorna JSON com tipo + status (sem dados pessoais)

[getCredential(tokenId)] → qualquer verificador consulta vcHash + status
    → compara com documento VC apresentado pelo aluno
```

---

## Arquitetura do Sistema

```
Admin (deployer ou multisig)
    ├── grantRole()  → adiciona issuers
    └── revokeRole() → remove issuers

Sistema da Universidade (backend Node/Python)
    └── carteira com ISSUER_ROLE
        ├── mint()   → emite diploma para o aluno
        └── revoke() → invalida credencial

Aluno
    └── endereço Ethereum (recebe token, não precisa ter ETH)
        └── guarda documento VC off-chain
            → apresenta para quem quiser verificar

Verificador (empresa, outra instituição)
    └── getCredential(tokenId) → vcHash + status
        → calcula hash do documento apresentado pelo aluno
        → compara: hash == vcHash && revoked == false
        → autenticidade confirmada sem depender da universidade
```
