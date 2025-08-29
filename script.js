// URL do seu Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyauiAXm1X-Mkx4Tn-QpfpLhRhv0LWOTtufAfx3I7ICH32I4q1mYvuW6fg1NlpIzuE/exec';

// Arrays globais
let vendedores = [];
let vendas = [];
let vendedorParaPagar = null;

// =================== UTILITÁRIOS ===================
const formatarMoeda = valor => `R$ ${parseFloat(valor || 0).toFixed(2).replace('.', ',')}`;

// Função para aplicar máscara enquanto digita
const aplicarMascaraMoeda = (input) => {
    let valor = input.value.replace(/\D/g, '');
    valor = (valor / 100).toFixed(2) + '';
    valor = valor.replace('.', ',');
    valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = 'R$ ' + valor;
};

const mostrarMensagem = (texto, tipo='sucesso') => {
    const container = document.getElementById('messageContainer');
    const box = document.getElementById('messageBox');
    const textElement = document.getElementById('messageText');

    box.className = 'p-4 rounded-lg shadow-lg';
    if (tipo === 'sucesso') box.classList.add('bg-green-100', 'text-green-800');
    else if (tipo === 'erro') box.classList.add('bg-red-100', 'text-red-800');

    textElement.textContent = texto;
    container.classList.remove('opacity-0');
    container.classList.add('opacity-100');

    setTimeout(() => {
        container.classList.remove('opacity-100');
        container.classList.add('opacity-0');
    }, 4000);
};

// =================== NAVEGAÇÃO ===================
const pages = document.querySelectorAll('.page');
const navButtons = document.querySelectorAll('.nav-btn');

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.page;
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById(target).classList.add('active');

        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// =================== FETCH DADOS ===================
async function fetchVendedores() {
    try {
        const res = await fetch(`${SCRIPT_URL}?sheet=Vendedores`);
        const data = await res.json();
        vendedores = data.map(v => ({
            id: v.Id,
            nome: v.Nome,
            telefone: v.Telefone,
            cep: v.CEP,
            rua: v.Rua,
            numero: v.Numero,
            bairro: v.Bairro,
            cidade: v.Cidade
        }));
        preencherVendedorDropdown();
        renderDashboard();
    } catch (err) {
        console.error(err);
        mostrarMensagem('Erro ao buscar vendedores', 'erro');
    }
}

async function fetchVendas() {
    try {
        const res = await fetch(`${SCRIPT_URL}?sheet=Vendas`);
        const data = await res.json();
        vendas = data.map(v => ({
            id: v.Id,
            vendedorId: v.id_vendedor,
            descricao: v.Descricao,
            valorTotal: parseFloat(v.ValorTotal.replace(/\./g,'').replace(',','.')) || 0,
            valorComissao: parseFloat(v.ValorComissao.replace(/\./g,'').replace(',','.')) || 0,
            tipoPagamento: v.TipoPagamento,
            valorEntrada: parseFloat(v.ValorEntrada?.replace(/\./g,'').replace(',','.')) || 0,
            comissaoPaga: v.ComissaoPaga || false
        }));
        renderDashboard();
    } catch (err) {
        console.error(err);
        mostrarMensagem('Erro ao buscar vendas', 'erro');
    }
}

// =================== DASHBOARD ===================
function renderDashboard() {
    const dash = document.getElementById('dashboardContent');
    dash.innerHTML = '';

    const totalGeral = vendas.reduce((total, v) => total + (v.valorTotal || 0), 0);
    document.getElementById('totalGeralVendas').textContent = formatarMoeda(totalGeral);

    vendedores.forEach(v => {
        const vendasVendedor = vendas.filter(ven => ven.vendedorId === v.id);
        const comissaoPendente = vendasVendedor.filter(ven => !ven.comissaoPaga).reduce((t, ven) => t + (ven.valorComissao || 0), 0);
        const comissaoPaga = vendasVendedor.filter(ven => ven.comissaoPaga).reduce((t, ven) => t + (ven.valorComissao || 0), 0);

        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-xl shadow-md';
        card.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800">${v.nome}</h3>
            <p class="text-gray-500">${v.cidade || ''} - ${v.bairro || ''}</p>
            <p class="mt-2 text-red-600 font-bold">Comissão Pendente: ${formatarMoeda(comissaoPendente)}</p>
            <p class="text-green-600 font-bold">Comissão Paga: ${formatarMoeda(comissaoPaga)}</p>
            ${comissaoPendente>0?`<button onclick="abrirModal(${v.id})" class="mt-2 bg-diamantelar-apoio-1-600 hover:bg-diamantelar-apoio-1-700 text-white py-1 px-3 rounded-lg">Pagar Comissão</button>`:''}
        `;
        dash.appendChild(card);
    });
}

// =================== CADASTRO VENDEDOR ===================
const vendedorForm = document.getElementById('vendedorForm');
vendedorForm.addEventListener('submit', async e => {
    e.preventDefault();
    const nome = document.getElementById('vendedorNome').value;
    const telefone = document.getElementById('vendedorTelefone').value;
    const cep = document.getElementById('vendedorCep').value;
    const rua = document.getElementById('vendedorRua').value;
    const numero = document.getElementById('vendedorNumero').value;
    const bairro = document.getElementById('vendedorBairro').value;
    const cidade = document.getElementById('vendedorCidade').value;

    try {
        await fetch(`${SCRIPT_URL}?sheet=Vendedores&nome=${encodeURIComponent(nome)}&telefone=${encodeURIComponent(telefone)}&cep=${cep}&rua=${encodeURIComponent(rua)}&numero=${numero}&bairro=${encodeURIComponent(bairro)}&cidade=${encodeURIComponent(cidade)}`);
        mostrarMensagem('Vendedor cadastrado com sucesso!');
        vendedorForm.reset();
        fetchVendedores();
        document.querySelector('[data-page="dashboard"]').click();
    } catch (err) {
        console.error(err);
        mostrarMensagem('Erro ao cadastrar vendedor', 'erro');
    }
});

// =================== AUTO-PREENCHIMENTO CEP ===================
document.getElementById('vendedorCep').addEventListener('blur', async () => {
    const cep = document.getElementById('vendedorCep').value.replace(/\D/g,'');
    if (cep.length !== 8) return;

    try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
            document.getElementById('vendedorRua').value = data.logradouro;
            document.getElementById('vendedorBairro').value = data.bairro;
            document.getElementById('vendedorCidade').value = data.localidade;
        }
    } catch (err) {
        console.error('Erro ao buscar CEP', err);
    }
});

// =================== CADASTRO VENDA ===================
const vendaForm = document.getElementById('vendaForm');
['vendaValorTotal','vendaValorComissao','valorEntrada'].forEach(id => {
    document.getElementById(id).addEventListener('input', (e) => aplicarMascaraMoeda(e.target));
});
vendaForm.addEventListener('submit', async e => {
    e.preventDefault();
    const vendedorId = document.getElementById('vendaVendedor').value;
    const descricao = document.getElementById('vendaDescricao').value;
    const valorTotal = document.getElementById('vendaValorTotal').value.replace(/\D/g,'') / 100;
    const valorComissao = document.getElementById('vendaValorComissao').value.replace(/\D/g,'') / 100;
    const tipoPagamento = document.getElementById('tipoPagamento').value;
    const valorEntrada = document.getElementById('valorEntrada').value.replace(/\D/g,'') / 100 || 0;

    try {
        await fetch(`${SCRIPT_URL}?sheet=Vendas&vendedorId=${vendedorId}&descricao=${encodeURIComponent(descricao)}&valorTotal=${valorTotal}&valorComissao=${valorComissao}&tipoPagamento=${tipoPagamento}&valorEntrada=${valorEntrada}`);
        mostrarMensagem('Venda registrada com sucesso!');
        vendaForm.reset();
        fetchVendas();
        document.querySelector('[data-page="dashboard"]').click();
    } catch (err) {
        console.error(err);
        mostrarMensagem('Erro ao registrar venda', 'erro');
    }
});

// =================== DROPDOWN VENDEDORES ===================
function preencherVendedorDropdown() {
    const select = document.getElementById('vendaVendedor');
    select.innerHTML = '<option value="">Selecione um vendedor</option>';
    vendedores.forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = v.nome;
        select.appendChild(option);
    });
}

// =================== MODAL COMISSÃO ===================
function abrirModal(vendedorId) {
    vendedorParaPagar = vendedorId;
    const vendedor = vendedores.find(v => v.id === vendedorId);
    document.getElementById('nomeVendedorModal').textContent = vendedor.nome;
    document.getElementById('comissaoModal').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('comissaoModal').style.display = 'none';
}

async function gerarReciboEPagar() {
    const formaPagamento = document.getElementById('formaPagamentoSelect').value;
    if (!vendedorParaPagar) return;

    try {
        await fetch(`${SCRIPT_URL}?action=pagarComissao&vendedorId=${vendedorParaPagar}&formaPagamento=${formaPagamento}`);
        mostrarMensagem('Comissão paga com sucesso!');
        fetchVendas();
        fecharModal();
    } catch (err) {
        console.error(err);
        mostrarMensagem('Erro ao pagar comissão', 'erro');
    }
}

// =================== INICIALIZAÇÃO ===================
window.addEventListener('DOMContentLoaded', () => {
    fetchVendedores();
    fetchVendas();
});
