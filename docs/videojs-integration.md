# Integração do Video.js

## Versão e fonte

- Pacote: `video.js` 8.23.9, instalado pelo npm e fixado no `package-lock.json`.
- Documentação oficial: [React](https://videojs.org/guides/react/), [opções](https://videojs.org/guides/options/) e [API Player](https://docs.videojs.com/player).
- O bundle é servido pela própria aplicação. Não usamos script ou CSS de CDN em tempo de execução.

## Organização

```text
src/components/player/
  VideoPlayer.tsx       ciclo de vida React e inicialização do Video.js
  types.ts              contrato mínimo de fontes e propriedades
  video-player.css      aparência isolada do player
  index.ts              API pública do módulo
```

O componente cria o elemento `video-js` no cliente, inicializa uma única instância e chama `dispose()` ao desmontar. Mudanças de fonte, poster, autoplay e mute atualizam a instância existente.

## Fronteiras de segurança

Video.js é um player, não um serviço de upload ou hospedagem, e não exige API key. Portanto:

- nenhuma credencial deve ser adicionada ao componente;
- upload, autorização e geração de URLs assinadas pertencem ao backend;
- URLs privadas devem expirar e ser limitadas ao ativo autorizado;
- o frontend deve receber apenas a URL reproduzível, nunca credenciais do storage ou CDN;
- domínios de embed e permissões serão validados no servidor;
- eventos de analytics enviados pelo player serão validados e limitados no servidor;
- HTML fornecido por clientes não deve ser injetado no player.

No MVP atual, o arquivo escolhido usa `URL.createObjectURL()` e permanece no navegador. A URL é revogada quando o vídeo muda ou a página desmonta.

## Próxima fase

Quando o backend existir, a interface receberá um DTO com `playbackUrl`, `mimeType`, `posterUrl` e identificadores opacos. O componente continuará independente do provedor de storage ou transcodificação.
