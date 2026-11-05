import 'dotenv/config';
import WebSocket from 'ws';
import { LeitorCLP } from './leitores/clp.js';

const BROKER = `${process.env.BROKER_URL}?token=${process.env.TOKEN_AGENTE}`;
const INTERVALO = Number(process.env.INTERVALO_MS || 500);

const ESTACOES = {
  estoque: {
    ip: '192.168.150.10',
    variaveis: {
      statusOk: 'DB9,X0.0',     
      emergencia: 'DB9,X0.1',   
      motorEsteira: 'DB9,X0.2', 
      magazine: 'DB9,B2'        
    }
  }
};

const estado = {
  estacoes: {
    estoque: { status: 'AGUARDANDO', magazine: 0 }
  }
};

const leitores = {};
let socket = null;

function conectarBroker() {
  socket = new WebSocket(BROKER);

  socket.on('open', () => {
    console.log('[Broker] Agente conectado');
  });

  socket.on('error', (err) => {
    console.error('[Erro no Broker WebSocket]:', err.message);
  });

  socket.on('message', async (raw) => {
    try {
      const comando = JSON.parse(raw);
      console.log('[Comando Recebido]:', comando);
      
      if (comando.acao === 'EMERGENCY_STOP') {
        if (leitores.estoque) await leitores.estoque.escrever('emergencia', true);
      } else if (comando.acao === 'START') {
        if (leitores.estoque) await leitores.estoque.escrever('statusOk', true);
      } else if (comando.acao === 'STOP') {
        if (leitores.estoque) await leitores.estoque.escrever('statusOk', false);
      } else if (comando.acao === 'RESET') {
        if (leitores.estoque) await leitores.estoque.escrever('emergencia', false);
      }
    } catch (e) {
      console.error('Erro ao processar comando:', e);
    }
  });

  socket.on('close', () => {
    console.log('[Broker] Desconectado. Tentando novamente em 5s...');
    setTimeout(conectarBroker, 5000);
  });
}

let lendo = false;

async function ciclo() {
  if (lendo) return; // Evita sobrecarregar a fila de leitura do CLP
  lendo = true;

  try {
    for (const [nome, leitor] of Object.entries(leitores)) {
      const valores = await leitor.ler();
      if (valores) {
        estado.estacoes[nome] = {
          status: valores.emergencia ? 'EMERGENCIA' : (valores.statusOk ? 'OPERANDO' : 'AGUARDANDO'),
          magazine: valores.magazine || 0
        };
      }
    }

    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify({ timestamp: new Date().toISOString(), ...estado }));
    }
  } catch (err) {
    console.error('Erro no ciclo de leitura:', err);
  } finally {
    lendo = false;
  }
}

async function iniciar() {
  for (const [nome, config] of Object.entries(ESTACOES)) {
    const leitor = new LeitorCLP(nome, config.ip);
    const ok = await leitor.conectar(config.variaveis);
    if (ok) leitores[nome] = leitor;
  }
  conectarBroker();
  setInterval(ciclo, INTERVALO);
}

iniciar();