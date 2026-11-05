import nodes7 from 'nodes7';

export class LeitorCLP {
  constructor(nome, ip) {
    this.nome = nome;
    this.ip = ip;
    this.conexao = new nodes7();
    this.conectado = false;
  }

  async conectar(variaveis) {
    return new Promise((resolve) => {
      this.conexao.initiateConnection(
        { host: this.ip, port: 102, rack: 0, slot: 1 },
        (err) => {
          if (err) {
            this.conectado = false;
            console.error(`[${this.nome}] Falha ao conectar em ${this.ip}:`, err.message);
            return resolve(false);
          }
          this.conexao.setTranslationCB((tag) => variaveis[tag]);
          this.conexao.addItems(Object.keys(variaveis));
          this.conectado = true;
          console.log(`[${this.nome}] Conectado com sucesso em ${this.ip}`);
          resolve(true);
        }
      );
    });
  }

  async ler() {
    if (!this.conectado) return null;
    return new Promise((resolve) => {
      this.conexao.readAllItems((erro, valores) => {
        if (erro) {
          this.conectado = false;
          return resolve(null);
        }
        resolve(valores);
      });
    });
  }

  async escrever(tag, valor) {
    if (!this.conectado) return false;
    return new Promise((resolve) => {
      this.conexao.writeItems(tag, valor, (erro) => {
        if (erro) {
          console.error(`[${this.nome}] Erro ao escrever na tag ${tag}:`, erro);
          return resolve(false);
        }
        resolve(true);
      });
    });
  }

  desconectar() {
    if (this.conectado) {
      this.conexao.dropConnection();
      this.conectado = false;
    }
  }
}