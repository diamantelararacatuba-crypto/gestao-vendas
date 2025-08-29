// URL do seu Apps Script (COLE AQUI A URL APÓS IMPLANTAÇÃO)
// A URL foi atualizada com a nova que você forneceu.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyauiAXm1X-Mkx4Tn-QpfpLhRhv0LWOTtufAfx3I7ICH32I4q1mYvuW6fg1NlpIzuE/exec';

// Variáveis globais para armazenar os dados e o estado do modal
let vendedores = [];
let vendas = [];
let vendedorParaPagar = null;

// Funções utilitárias
const formatarMoeda = (valor) => {
    return `R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`;
};

const adicionarMascaraMoeda = (input) => {
    let value = input.value.replace(/\D/g, '');
    if (value.length === 0) {
        input.value = '';
        return;
    }
    value = value.replace(/(\d)(\d{2})$/, '$1,$2');
    value = value.replace(/(?=(\d{3})+(\D))\B/g, '.');
    input.value = 'R$ ' + value;
};

const formatarNome = (input) => {
    let nome = input.value;
    nome = nome.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
    input.value = nome;
};

const formatarCEP = (input) => {
    let cep = input.value.replace(/\D/g, '');
    if (cep.length === 8) {
        input.value = cep.substring(0, 5) + '-' + cep.substring(5);
    }
};

const formatarTelefone = (input) => {
    let telefone = input.value.replace(/\D/g, '');
    if (telefone.length === 11) {
        input.value = `(${telefone.substring(0, 2)}) ${telefone.substring(2, 7)}-${telefone.substring(7)}`;
    } else if (telefone.length === 10) {
        input.value = `(${telefone.substring(0, 2)}) ${telefone.substring(2, 6)}-${telefone.substring(6)}`;
    }
};

const mostrarMensagem = (texto, tipo) => {
    const container = document.getElementById('messageContainer');
    const box = document.getElementById('messageBox');
    const textElement = document.getElementById('messageText');
    
    box.className = 'p-4 rounded-lg shadow-lg';
    if (tipo === 'sucesso') {
        box.classList.add('bg-green-100', 'text-green-800');
    } else if (tipo === 'erro') {
        box.classList.add('bg-red-100', 'text-red-800');
    }
    
    textElement.textContent = texto;
    container.classList.remove('opacity-0');
    container.classList.add('opacity-100');
    
    setTimeout(() => {
        container.classList.remove('opacity-100');
        container.classList.add('opacity-0');
    }, 5000);
};

// Funções de comunicação com o Google Sheets
const fetchVendedores = async () => {
    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Vendedores`);
        const data = await response.json();
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
        abastecerVendedores();
    } catch (error) {
        console.error('Erro ao buscar vendedores:', error);
    }
};

const fetchVendas = async () => {
    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Vendas`);
        const data = await response.json();
        vendas = data.map(v => ({
            id: v.Id,
            vendedorId: v.id_vendedor,
            descricao: v.Descricao,
            valorTotal: v.ValorTotal,
            valorComissao: v.ValorComissao,
            tipoPagamento: v.TipoPagamento,
            valorEntrada: v.ValorEntrada || null,
            comissaoPaga: v.ComissaoPaga || false
        }));
        renderDashboard();
    } catch (error) {
        console.error('Erro ao buscar vendas:', error);
    }
};

// Renderiza a dashboard
const renderDashboard = () => {
    const dashboardContent = document.getElementById('dashboardContent');
    dashboardContent.innerHTML = '';
    
    let totalGeralVendas = vendas.reduce((total, venda) => total + (venda.valorTotal || 0), 0);
    document.getElementById('totalGeralVendas').textContent = formatarMoeda(totalGeralVendas);

    vendedores.forEach(vendedor => {
        const vendasVendedor = vendas.filter(v => v.vendedorId === vendedor.id);
        const comissaoPendente = vendasVendedor
            .filter(v => !v.comissaoPaga)
            .reduce((total, venda) => total + (venda.valorComissao || 0), 0);
            
        const comissaoPaga = vendasVendedor
            .filter(v => v.comissaoPaga)
            .reduce((total, venda) => total + (venda.valorComissao || 0), 0);

        const card = document.createElement('div');
        card.className = 'bg-white p-6 rounded-xl shadow-md';
        card.innerHTML = `
            <div class="mb-4">
                <h3 class="text-xl font-semibold text-gray-800">${vendedor.nome}</h3>
                <p class="text-gray-500">${vendedor.cidade || ''} - ${vendedor.bairro || ''}</p>
            </div>
            <div class="mb-4">
                <p class="text-lg font-medium text-gray-700">Comissão Pendente:</p>
                <p class="text-3xl font-bold text-red-500">${formatarMoeda(comissaoPendente)}</p>
                <p class="text-lg font-medium text-gray-700 mt-2">Comissão Paga:</p>
                <p class="text-xl font-bold text-green-500">${formatarMoeda(comissaoPaga)}</p>
            </div>
            <div class="flex space-x-2">
                ${comissaoPendente > 0 ? `<button onclick="abrirModal(${vendedor.id})" class="flex-1 bg-diamantelar-apoio-1-600 hover:bg-diamantelar-apoio-1-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Pagar Comissão</button>` : ''}
                <button onclick="removerVendedor(${vendedor.id})" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">Remover</button>
            </div>
        `;
        dashboardContent.appendChild(card);
    });
};

// Abastece o dropdown de vendedores
const abastecerVendedores = () => {
    const select = document.getElementById('vendaVendedor');
    select.innerHTML = '<option value="">Selecione um vendedor</option>';
    vendedores.forEach(vendedor => {
        const option = document.createElement('option');
        option.value = vendedor.id;
        option.textContent = vendedor.nome;
        select.appendChild(option);
    });
};

// Funções do Modal de Comissão
const abrirModal = (vendedorId) => {
    vendedorParaPagar = vendedorId;
    const vendedor = vendedores.find(v => v.id === vendedorId);
    document.getElementById('nomeVendedorModal').textContent = vendedor.nome;
    renderizarVendasPendentes();
    document.getElementById('comissaoModal').style.display = 'flex';
};

const fecharModal = () => {
    document.getElementById('comissaoModal').style.display = 'none';
};

const atualizarTotalPagar = () => {
    const checkboxes = document.querySelectorAll('#vendasPendentesContainer input[type="checkbox"]:checked');
    let total = 0;
    checkboxes.forEach(checkbox => {
        const vendaId = parseInt(checkbox.value);
        const venda = vendas.find(v => v.id === vendaId);
        if (venda) {
            total += venda.valorComissao;
        }
    });
    document.getElementById('totalComissaoPagar').textContent = formatarMoeda(total);
};

const renderizarVendasPendentes = () => {
    const container = document.getElementById('vendasPendentesContainer');
    container.innerHTML = '';
    
    const vendasPendentes = vendas.filter(v => v.vendedorId === vendedorParaPagar && !v.comissaoPaga);
    
    if (vendasPendentes.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">Nenhuma comissão pendente.</p>';
        document.getElementById('totalComissaoPagar').textContent = formatarMoeda(0);
        return;
    }

    vendasPendentes.forEach(venda => {
        const div = document.createElement('label');
        div.className = 'venda-item cursor-pointer hover:bg-gray-50 transition-colors';
        div.innerHTML = `
            <input type="checkbox" value="${venda.id}" onchange="atualizarTotalPagar()" class="form-checkbox text-diamantelar-padrao-600 rounded">
            <div class="flex-1">
                <p class="font
