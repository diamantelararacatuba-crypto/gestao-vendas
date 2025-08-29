// URL do seu Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx-JzIr3tw_Uj7cBpzhklZ2pR3CLcaJY8ZAWdcNM54GhIUPNSfpg0EqpdYtRwi0B3wM/exec';

let vendedores = [];
let vendas = [];
let vendedorParaPagar = null;

// -------------------- UTILITÁRIOS --------------------
const formatarMoeda = valor => `R$ ${parseFloat(valor || 0).toFixed(2).replace('.', ',')}`;

const formatarNome = input => {
    input.value = input.value.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const mostrarMensagem = (texto, tipo = 'sucesso') => {
    const container = document.getElementById('messageContainer');
    const box = document.getElementById('messageBox');
    const text = document.getElementById('messageText');
    
    box.className = 'p-4 rounded-lg shadow-lg';
    if(tipo === 'sucesso') box.classList.add('bg-green-100','text-green-800');
    else box.classList.add('bg-red-100','text-red-800');
    
    text.textContent = texto;
    container.classList.remove('opacity-0'); container.classList.add('opacity-100');
    
    setTimeout(() => { container.classList.remove('opacity-100'); container.classList.add('opacity-0'); }, 5000);
};

// -------------------- PÁGINAS --------------------
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        document.getElementById(btn.dataset.page).classList.add('active');
        btn.classList.add('active');
    });
});

// -------------------- BUSCA DADOS --------------------
async function fetchVendedores() {
    try {
        const res = await fetch(`${SCRIPT_URL}?sheet=Vendedores`);
        const data = await res.json();
        vendedores = data.map(v => ({
            id: v.Id, nome: v.Nome, telefone: v.Telefone,
            cep: v.CEP, rua: v.Rua, numero: v.Numero,
            bairro: v.Bairro, cidade: v.Cidade
        }));
        abastecerVendedores();
        renderDashboard();
    } catch(e) { console.error(e); mostrarMensagem('Erro ao carregar vendedores', 'erro'); }
}

async function fetchVendas() {
    try {
        const res = await fetch(`${SCRIPT_URL}?sheet=Vendas`);
        const data = await res.json();
        vendas = data.map(v => ({
            id: v.Id, vendedorId: v.id_vendedor,
            descricao: v.Descricao, valorTotal: v.ValorTotal,
            valorComissao: v.ValorComissao,
            tipoPagamento: v.TipoPagamento,
            valorEntrada: v.ValorEntrada || null,
            comissaoPaga: v.ComissaoPaga || false
        }));
        renderDashboard();
    } catch(e) { console.error(e); mostrarMensagem('Erro ao carregar vendas', 'erro'); }
}

// -------------------- RENDER DASHBOARD --------------------
function renderDashboard() {
    const dashboardContent = document.getElementById('dashboardContent');
    dashboardContent.innerHTML = '';
    const totalGeralVendas = vendas.reduce((t,v) => t + parseFloat(v.valorTotal || 0), 0);
    document.getElementById('totalGeralVendas').textContent = formatarMoeda(totalGeralVendas);

    vendedores.forEach(v => {
        const vendasVendedor = vendas.filter(x => x.vendedorId === v.id);
        const comissaoPendente = vendasVendedor.filter(x=>!x.comissaoPaga).reduce((t,x)=>t+parseFloat(x.valorComissao||0),0);
        const comissaoPaga = vendasVendedor.filter(x=>x.comissaoPaga).reduce((t,x)=>t+parseFloat(x.valorComissao||0),0);

        const card = document.createElement('div');
        card.className = 'bg-white p-6 rounded-xl shadow-md';
        card.innerHTML = `
            <div class="mb-4">
                <h3 class="text-xl font-semibold text-gray-800">${v.nome}</h3>
                <p class="text-gray-500">${v.cidade || ''} - ${v.bairro || ''}</p>
            </div>
            <div class="mb-4">
                <p class="text-lg font-medium text-gray-700">Comissão Pendente:</p>
                <p class="text-3xl font-bold text-red-500">${formatarMoeda(comissaoPendente)}</p>
                <p class="text-lg font-medium text-gray-700 mt-2">Comissão Paga:</p>
                <p class="text-xl font-bold text-green-500">${formatarMoeda(comissaoPaga)}</p>
            </div>
            <div class="flex space-x-2">
                ${comissaoPendente>0?`<button onclick="abrirModal(${v.id})" class="flex-1 bg-diamantelar-apoio-1-600 hover:bg-diamantelar-apoio-1-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Pagar Comissão</button>`:''}
            </div>
        `;
        dashboardContent.appendChild(card);
    });
}

// -------------------- ABRIR MODAL COMISSÃO --------------------
function abrirModal(vendedorId) {
    vendedorParaPagar = vendedorId;
    const vendedor = vendedores.find(v=>v.id===vendedorId);
    document.getElementById('nomeVendedorModal').textContent = vendedor.nome;
    renderizarVendasPendentes();
    document.getElementById('comissaoModal').style.display = 'flex';
}

function fecharModal() { document.getElementById('comissaoModal').style.display = 'none'; }

function renderizarVendasPendentes() {
    const container = document.getElementById('vendasPendentesContainer');
    container.innerHTML = '';
    const pendentes = vendas.filter(v=>v.vendedorId===vendedorParaPagar && !v.comissaoPaga);
    if(pendentes.length===0){ container.innerHTML='<p class="text-center text-gray-500">Nenhuma comissão pendente.</p>'; return; }

    pendentes.forEach(v=>{
        const div = document.createElement('label');
        div.className='venda-item cursor-pointer hover:bg-gray-50 transition-colors flex items-center mb-2';
        div.innerHTML=`
            <input type="checkbox" value="${v.id}" onchange="atualizarTotalPagar()" class="mr-2">
            <span>${v.descricao} - ${formatarMoeda(v.valorComissao)}</span>
        `;
        container.appendChild(div);
    });
}

function atualizarTotalPagar() {
    const totalEl = document.getElementById('totalComissaoPagar');
    const checkboxes = document.querySelectorAll('#vendasPendentesContainer input[type="checkbox"]:checked');
    let total=0;
    checkboxes.forEach(c=>{
        const v = vendas.find(x=>x.id==c.value);
        if(v) total+=parseFloat(v.valorComissao||0);
    });
    if(totalEl) totalEl.textContent=formatarMoeda(total);
}

// -------------------- GERAR PDF --------------------
function gerarReciboEPagar() {
    const checkboxes = document.querySelectorAll('#vendasPendentesContainer input[type="checkbox"]:checked');
    if(checkboxes.length===0){ mostrarMensagem('Selecione pelo menos uma venda','erro'); return; }

    const vendedor = vendedores.find(v=>v.id===vendedorParaPagar);
    const vendasSelecionadas = checkboxes.length>0?Array.from(checkboxes).map(c=>vendas.find(v=>v.id==c.value)):[];

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Recibo de Pagamento de Comissão', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Vendedor: ${vendedor.nome}`, 20, 40);
    doc.text(`Forma de Pagamento: ${document.getElementById('formaPagamentoSelect').value}`, 20, 48);

    let y = 60;
    let totalComissao=0;
    vendasSelecionadas.forEach(v=>{
        doc.text(`Venda #${v.id}: ${v.descricao} - ${formatarMoeda(v.valorComissao)}`, 20, y);
        y+=8;
        totalComissao+=parseFloat(v.valorComissao||0);
    });
    doc.text(`Total de Comissão: ${formatarMoeda(totalComissao)}`, 20, y+8);

    doc.save(`Recibo_Comissao_${vendedor.nome}.pdf`);

    // MARCAR COMO PAGA no Apps Script
    vendasSelecionadas.forEach(v=>{
        fetch(SCRIPT_URL, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ action:'pagarComissao', id:v.id })
        });
    });

    fecharModal();
    fetchVendas();
}

// -------------------- ABSTECER VENDEDOR NO SELECT --------------------
function abastecerVendedores() {
    const select = document.getElementById('vendaVendedor');
    if(!select) return;
    select.innerHTML='<option value="">Selecione um vendedor</option>';
    vendedores.forEach(v=>{
        const opt=document.createElement('option'); opt.value=v.id; opt.textContent=v.nome;
        select.appendChild(opt);
    });
}

// -------------------- CADASTRO VENDEDOR --------------------
document.getElementById('vendedorForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const vendedor={
        nome: document.getElementById('vendedorNome').value,
        telefone: document.getElementById('vendedorTelefone').value,
        cep: document.getElementById('vendedorCep').value,
        rua: document.getElementById('vendedorRua').value,
        numero: document.getElementById('vendedorNumero').value,
        bairro: document.getElementById('vendedorBairro').value,
        cidade: document.getElementById('vendedorCidade').value
    };
    try{
        const res = await fetch(SCRIPT_URL, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ action:'cadastrarVendedor', data:vendedor })
        });
        const data = await res.json();
        mostrarMensagem(data.message);
        fetchVendedores();
        document.getElementById('vendedorForm').reset();
    }catch(err){ console.error(err); mostrarMensagem('Erro ao cadastrar vendedor','erro'); }
});

// -------------------- CADASTRO VENDA --------------------
document.getElementById('vendaForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const venda={
        id_vendedor: document.getElementById('vendaVendedor').value,
        descricao: document.getElementById('vendaDescricao').value,
        valorTotal: document.getElementById('vendaValorTotal').value,
        valorComissao: document.getElementById('vendaValorComissao').value,
        tipoPagamento: document.getElementById('tipoPagamento').value,
        valorEntrada: document.getElementById('valorEntrada').value
    };
    try{
        const res = await fetch(SCRIPT_URL,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ action:'registrarVenda', data:venda })
        });
        const data = await res.json();
        mostrarMensagem(data.message);
        fetchVendas();
        document.getElementById('vendaForm').reset();
    }catch(err){ console.error(err); mostrarMensagem('Erro ao registrar venda','erro'); }
});

// -------------------- CEP AUTOMÁTICO --------------------
document.getElementById('vendedorCep').addEventListener('blur', async e=>{
    const cep = e.target.value.replace(/\D/g,'');
    if(cep.length!==8) return;

    try{
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if(!data.erro){
            document.getElementById('vendedorRua').value=data.logradouro||'';
            document.getElementById('vendedorBairro').value=data.bairro||'';
            document.getElementById('vendedorCidade').value=data.localidade||'';
        }
    }catch(err){ console.error(err); }
});

// -------------------- INIT --------------------
fetchVendedores();
fetchVendas();

