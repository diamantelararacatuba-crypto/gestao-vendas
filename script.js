// ===================== CONFIGURAÇÃO =====================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyauiAXm1X-Mkx4Tn-QpfpLhRhv0LWOTtufAfx3I7ICH32I4q1mYvuW6fg1NlpIzuE/exec';

let vendedores = [];
let vendas = [];
let vendedorParaPagar = null;

// ===================== UTILITÁRIOS =====================
const formatarMoeda = valor => `R$ ${parseFloat(valor || 0).toFixed(2).replace('.', ',')}`;

const aplicarMascaraMoeda = (input) => {
    let valor = input.value.replace(/\D/g, '');
    valor = (valor / 100).toFixed(2) + '';
    valor = valor.replace('.', ',');
    valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = 'R$ ' + valor;
};

const aplicarMascaraTelefone = (input) => {
    let tel = input.value.replace(/\D/g, '');
    if (tel.length === 11) input.value = `(${tel.substring(0,2)}) ${tel.substring(2,7)}-${tel.substring(7)}`;
    else if (tel.length === 10) input.value = `(${tel.substring(0,2)}) ${tel.substring(2,6)}-${tel.substring(6)}`;
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

// ===================== NAVEGAÇÃO =====================
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

// ===================== FETCH DADOS =====================
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

// ===================== DASHBOARD =====================
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

// ===================== CADASTRO VENDEDOR =====================
const vendedorForm = document.getElementById('vendedorForm');
vendedorForm.addEventListener('submit', async e => {
    e.preventDefault();
    const nome = document.getElementById('vendedorNome').value.trim();
    const telefone = document.getElementById('vendedorTelefone').value.trim();
    const cep = document.getElementById('vendedorCep').value.trim();
    const rua = document.getElementById('vendedorRua').value.trim();
    const numero = document.getElementById('vendedorNumero').value.trim();
    const bairro = document.getElementById('vendedorBairro').value.trim();
    const cidade = document.getElementById('vendedorCidade').value.trim();

    if (!nome) return mostrarMensagem('O nome é obrigatório', 'erro');

    try {
        const url = `${SCRIPT_URL}?sheet=Vendedores&action=add&nome=${encodeURIComponent(nome)}&telefone=${encodeURIComponent(telefone)}&cep=${cep}&rua=${encodeURIComponent(rua)}&numero=${numero}&bairro=${encodeURIComponent(bairro)}&cidade=${encodeURIComponent(cidade)}`;
        await fetch(url);
        mostrarMensagem('Vendedor cadastrado com sucesso!');
        vendedorForm.reset();
        fetchVendedores();
        document.querySelector('[data-page="dashboard"]').click();
    } catch (err) {
        console.error(err);
        mostrarMensagem('Erro ao cadastrar vendedor', 'erro');
    }
});

// ===================== CADASTRO VENDA =====================
const vendaForm = document.getElementById('vendaForm');
vendaForm.addEventListener('submit', async e => {
    e.preventDefault();
    const vendedorId = document.getElementById('vendaVendedor').value;
    const descricao = document.getElementById('vendaDescricao').value.trim();
    const valorTotal = document.getElementById('vendaValorTotal').value.replace(/\D/g,'') / 100;
    const valorComissao = document.getElementById('vendaValorComissao').value.replace(/\D/g,'') / 100;
    const tipoPagamento = document.getElementById('tipoPagamento').value;
    const valorEntrada = document.getElementById('valorEntrada').value ? document.getElementById('valorEntrada').value.replace(/\D/g,'') / 100 : 0;

    if (!vendedorId || !descricao || !valorTotal || !valorComissao) return mostrarMensagem('Preencha todos os campos obrigatórios', 'erro');

    try {
        const url = `${SCRIPT_URL}?sheet=Vendas&action=add&vendedorId=${vendedorId}&descricao=${encodeURIComponent(descricao)}&valorTotal=${valorTotal}&valorComissao=${valorComissao}&tipoPagamento=${tipoPagamento}&valorEntrada=${valorEntrada}`;
        await fetch(url);
        mostrarMensagem('Venda cadastrada com sucesso!');
        vendaForm.reset();
        fetchVendas();
        document.querySelector('[data-page="dashboard"]').click();
    } catch (err) {
        console.error(err);
        mostrarMensagem('Erro ao cadastrar venda', 'erro');
    }
});

// ===================== DROPDOWN VENDEDORES =====================
function preencherVendedorDropdown() {
    const select = document.getElementById('vendaVendedor');
    select.innerHTML = '<option value="">Selecione um vendedor</option>';
    vendedores.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = v.nome;
        select.appendChild(opt);
    });
}

// ===================== MODAL COMISSÃO =====================
function abrirModal(vendedorId) {
    vendedorParaPagar = vendedorId;
    const vendedor = vendedores.find(v => v.id === vendedorId);
    document.getElementById('nomeVendedorModal').textContent = vendedor.nome;

    const container = document.getElementById('vendasPendentesContainer');
    container.innerHTML = '';

    const vendasPendentes = vendas.filter(v => v.vendedorId === vendedorId && !v.comissaoPaga);
    if (vendasPendentes.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">Nenhuma comissão pendente.</p>';
    } else {
        vendasPendentes.forEach(venda => {
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between border-b py-2';
            div.innerHTML = `
                <label class="flex-1 cursor-pointer">
                    <input type="checkbox" value="${venda.id}" class="mr-2">
                    [${venda.id}] ${venda.descricao} - ${formatarMoeda(venda.valorComissao)}
                </label>
            `;
            container.appendChild(div);
        });
    }

    document.getElementById('comissaoModal').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('comissaoModal').style.display = 'none';
}

async function gerarReciboEPagar() {
    const checkboxes = document.querySelectorAll('#vendasPendentesContainer input[type="checkbox"]:checked');
    if (checkboxes.length === 0) return mostrarMensagem('Selecione pelo menos uma venda', 'erro');

    const formaPagamento = document.getElementById('formaPagamentoSelect').value;
    const vendasSelecionadas = checkboxesArray(checkboxes).map(c => vendas.find(v => v.id == c.value));

    // Atualiza no Google Sheets
    for (const venda of vendasSelecionadas) {
        const url = `${SCRIPT_URL}?sheet=Vendas&action=pay&id=${venda.id}&formaPagamento=${encodeURIComponent(formaPagamento)}`;
        await fetch(url);
    }

    // Gera PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Recibo de Comissão - Diamantelar`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Vendedor: ${vendedores.find(v => v.id === vendedorParaPagar).nome}`, 20, 35);

    let y = 50;
    let total = 0;
    vendasSelecionadas.forEach(v => {
        doc.text(`[${v.id}] ${v.descricao} - ${formatarMoeda(v.valorComissao)}`, 20, y);
        total += v.valorComissao;
        y += 10;
    });

    doc.text(`Total Comissão: ${formatarMoeda(total)}`, 20, y + 5);
    doc.text(`Forma de Pagamento: ${formaPagamento}`, 20, y + 15);
    doc.save(`Recibo_Comissao_${Date.now()}.pdf`);

    fecharModal();
    mostrarMensagem('Comissão paga com sucesso!');
    fetchVendas();
}

function checkboxesArray(checkboxes) {
    return Array.prototype.slice.call(checkboxes);
}

// ===================== INICIALIZAÇÃO =====================
window.addEventListener('DOMContentLoaded', () => {
    fetchVendedores();
    fetchVendas();

    document.getElementById('vendedorTelefone').addEventListener('input', e => aplicarMascaraTelefone(e.target));
    document.getElementById('vendaValorTotal').addEventListener('input', e => aplicarMascaraMoeda(e.target));
    document.getElementById('vendaValorComissao').addEventListener('input', e => aplicarMascaraMoeda(e.target));
    document.getElementById('valorEntrada').addEventListener('input', e => aplicarMascaraMoeda(e.target));
});
