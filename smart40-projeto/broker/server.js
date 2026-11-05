import { WebSocketServer } from 'ws';

const PORTA = process.env.PORT || 8080;

const TOKENS = new Set([
  'unidade1-agente',
  'unidade1-grupo1', 'unidade1-grupo2', 'unidade1-grupo3',
  'unidade1-grupo4', 'unidade1-grupo5'
]);

const conexoes = new Map();

function unidadeDoToken(token) {
  return token.split('-')[0];
}

const wss = new WebSocketServer({ port: PORTA });

wss.on('connection', (socket, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token || !TOKENS.has(token)) {
    socket.close(4001, 'Token inválido');
    return;
  }

  const anterior = conexoes.get(token);
  if (anterior && anterior.readyState === 1) {
    anterior.close(4002, 'Substituída por nova conexão');
  }

  conexoes.set(token, socket);
  const unidade = unidadeDoToken(token);
  console.log(`[conectado] ${token} (${unidade})`);

  socket.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (token.endsWith('-agente')) {
      for (const [t, s] of conexoes) {
        if (t.startsWith(`${unidade}-grupo`) && s.readyState === 1) {
          s.send(JSON.stringify(msg));
        }
      }
      return;
    }

    const agente = conexoes.get(`${unidade}-agente`);
    if (agente && agente.readyState === 1) {
      agente.send(JSON.stringify({ ...msg, origem: token }));
    } else {
      socket.send(JSON.stringify({
        tipo: 'erro',
        mensagem: 'Agente da bancada offline'
      }));
    }
  });

  socket.on('close', () => {
    if (conexoes.get(token) === socket) {
      conexoes.delete(token);
      console.log(`[desconectado] ${token}`);
    }
  });
});

console.log(`Broker ouvindo na porta ${PORTA}`);