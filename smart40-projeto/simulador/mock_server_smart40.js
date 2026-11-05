import { WebSocketServer } from 'ws';

const PORTA = 8080;
const wss = new WebSocketServer({ port: PORTA });

console.log(`Simulador da Bancada Smart 4.0 rodando na porta ${PORTA}...`);

let estadoSimulado = {
  timestamp: new Date().toISOString(),
  estacoes: {
    estoque: { status: 'OPERANDO', magazine: 1 }
  }
};

wss.on('connection', (socket) => {
  console.log('[Simulador] Cliente conectado!');

  // Envia telemetria falsa a cada 1 segundo
  const intervalo = setInterval(() => {
    estadoSimulado.timestamp = new Date().toISOString();
    socket.send(JSON.stringify(estadoSimulado));
  }, 1000);

  socket.on('message', (raw) => {
    try {
      const comando = JSON.parse(raw);
      console.log('[Simulador - Comando Recebido]:', comando);

      if (comando.acao === 'EMERGENCY_STOP') {
        estadoSimulado.estacoes.estoque.status = 'EMERGENCIA';
      } else if (comando.acao === 'START') {
        estadoSimulado.estacoes.estoque.status = 'OPERANDO';
      } else if (comando.acao === 'STOP') {
        estadoSimulado.estacoes.estoque.status = 'AGUARDANDO';
      } else if (comando.acao === 'RESET') {
        estadoSimulado.estacoes.estoque.status = 'AGUARDANDO';
      }
    } catch (e) {
      console.error('Erro ao processar mensagem no simulador:', e);
    }
  });

  socket.on('close', () => {
    clearInterval(intervalo);
    console.log('[Simulador] Cliente desconectado.');
  });
});