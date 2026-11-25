// Caminho do api.php: a pasta "back" fica ao lado da pasta "front".
const API_URL = "../back/api.php";

const cadastroForm = document.querySelector("#cadastro-form");
const cadastroMensagem = document.querySelector("#cadastro-mensagem");

const publicacaoForm = document.querySelector("#publicacao-form");
const publicacaoMensagem = document.querySelector("#publicacao-mensagem");

const feed = document.querySelector("#feed");
const atualizarFeed = document.querySelector("#atualizar-feed");

let usuarioAtual = null;

try {
    usuarioAtual = JSON.parse(localStorage.getItem("usuarioAtual") || "null");
} catch {
    localStorage.removeItem("usuarioAtual");
}

// Exibe mensagens nos formulários.
function mostrarMensagem(elemento, texto, erro = false) {
    elemento.textContent = texto;
    elemento.classList.toggle("erro", erro);
}

// Faz as requisições para a API e mostra detalhes caso ocorra um erro.
async function requisicao(rota, metodo = "GET", dados = null) {
    const url = `${API_URL}?rota=${encodeURIComponent(rota)}`;

    const opcoes = {
        method: metodo,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (dados !== null) {
        opcoes.body = JSON.stringify(dados);
    }

    let resposta;

    try {
        resposta = await fetch(url, opcoes);
    } catch (erro) {
        throw new Error(
            `Não foi possível acessar a API.\n` +
            `Endereço: ${url}\n` +
            `Detalhe: ${erro.message}`
        );
    }

    const texto = await resposta.text();

    let resultado = null;

    try {
        resultado = texto ? JSON.parse(texto) : null;
    } catch {
        throw new Error(
            `HTTP ${resposta.status} ${resposta.statusText}\n` +
            `A resposta não é JSON.\n` +
            `Endereço: ${url}\n` +
            `Resposta recebida: ${texto.slice(0, 500)}`
        );
    }

    if (!resposta.ok) {
        throw new Error(
            `HTTP ${resposta.status} ${resposta.statusText}\n` +
            `Mensagem: ${resultado?.erro || texto || "Erro na API"}\n` +
            `Endereço: ${url}`
        );
    }

    return resultado;
}

// CADASTRO
cadastroForm.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const dados = {
        nome: document.querySelector("#nome").value.trim(),
        username: document.querySelector("#username").value.trim(),
        email: document.querySelector("#email").value.trim(),
        senha: document.querySelector("#senha").value
    };

    try {
        const resultado = await requisicao("usuario", "POST", dados);

        if (!resultado?.id_usuario) {
            throw new Error(
                "A API respondeu, mas não retornou id_usuario. Confira o controller de usuário."
            );
        }

        usuarioAtual = {
            id_usuario: resultado.id_usuario,
            nome: dados.nome,
            username: dados.username
        };

        localStorage.setItem("usuarioAtual", JSON.stringify(usuarioAtual));

        mostrarMensagem(
            cadastroMensagem,
            resultado.mensagem || "Cadastro realizado com sucesso!"
        );

        cadastroForm.reset();
    } catch (erro) {
        mostrarMensagem(cadastroMensagem, erro.message, true);
    }
});

// CRIAR PUBLICAÇÃO
publicacaoForm.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (!usuarioAtual?.id_usuario) {
        mostrarMensagem(
            publicacaoMensagem,
            "Cadastre-se primeiro para publicar.",
            true
        );
        return;
    }

    const dados = {
        id_usuario: usuarioAtual.id_usuario,
        legenda: document.querySelector("#legenda").value.trim(),
        imagem_url: document.querySelector("#imagem-url").value.trim() || null
    };

    try {
        const resultado = await requisicao("publicacao", "POST", dados);

        mostrarMensagem(
            publicacaoMensagem,
            resultado?.mensagem || "Publicação criada com sucesso!"
        );

        publicacaoForm.reset();
        await carregarFeed();
    } catch (erro) {
        mostrarMensagem(publicacaoMensagem, erro.message, true);
    }
});

// CARREGAR FEED
async function carregarFeed() {
    feed.innerHTML = '<p class="estado-feed">Carregando publicações...</p>';

    try {
        const publicacoes = await requisicao("publicacao", "GET");

        if (!Array.isArray(publicacoes)) {
            throw new Error("A API não retornou uma lista de publicações.");
        }

        if (publicacoes.length === 0) {
            feed.innerHTML = '<p class="estado-feed">Ainda não há publicações.</p>';
            return;
        }

        feed.replaceChildren();

        publicacoes.slice().reverse().forEach((publicacao) => {
            feed.appendChild(criarCardPublicacao(publicacao));
        });
    } catch (erro) {
        feed.replaceChildren();

        const mensagem = document.createElement("p");
        mensagem.className = "estado-feed";
        mensagem.textContent = `Erro ao carregar o feed: ${erro.message}`;

        feed.appendChild(mensagem);
    }
}

// CRIAR CARD DE PUBLICAÇÃO
function criarCardPublicacao(publicacao) {
    const card = document.createElement("article");
    card.className = "publicacao";

    const topo = document.createElement("div");
    topo.className = "publicacao-topo";
    topo.textContent = `Publicação #${publicacao.id_publicacao}`;

    const legenda = document.createElement("p");
    legenda.className = "publicacao-legenda";
    legenda.textContent = publicacao.legenda || "";

    card.append(topo, legenda);

    if (publicacao.imagem_url) {
        const imagem = document.createElement("img");

        imagem.className = "publicacao-imagem";
        imagem.src = publicacao.imagem_url;
        imagem.alt = "Imagem da publicação";
        imagem.loading = "lazy";

        imagem.addEventListener("error", () => {
            imagem.remove();
        });

        card.appendChild(imagem);
    }

    const botaoCurtir = document.createElement("button");
    botaoCurtir.className = "botao-curtir";
    botaoCurtir.type = "button";
    botaoCurtir.textContent = "♡ Curtir";

    botaoCurtir.addEventListener("click", async () => {
        if (!usuarioAtual?.id_usuario) {
            alert("Cadastre-se primeiro para curtir publicações.");
            return;
        }

        botaoCurtir.disabled = true;

        try {
            await requisicao("curtida", "POST", {
                id_usuario: usuarioAtual.id_usuario,
                id_publicacao: publicacao.id_publicacao
            });

            botaoCurtir.textContent = "♥ Curtido";
        } catch (erro) {
            alert(erro.message);
        } finally {
            botaoCurtir.disabled = false;
        }
    });

    card.appendChild(botaoCurtir);

    return card;
}

// BOTÃO ATUALIZAR
atualizarFeed.addEventListener("click", carregarFeed);

// Carrega as publicações quando a página abre.
carregarFeed();