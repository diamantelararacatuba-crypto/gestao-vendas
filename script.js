// URL do seu Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx-JzIr3tw_Uj7cBpzhklZ2pR3CLcaJY8ZAWdcNM54GhIUPNSfpg0EqpdYtRwi0B3wM/exec';

let vendedores = [];
let vendas = [];
let vendedorParaPagar = null;

// -------------------- UTILITÁRIOS --------------------
const formatarMoeda = valor => `R$ ${parseFloat(valor || 0).toFixed(2).replace('.', ',')}`;
const mostrarMensagem = (texto, tipo='sucesso') => {
    const container = document.getElementById('messageContainer');
    const box = document.getElementById('messageBox');
    const text = document.getElementById('messageText');
    box.className = 'p-4 rounded-lg shadow-lg';
    if(tipo==='sucesso') box.classList.add('bg-green-100','text-green-800');
    else box.classList.add('bg-red-100','text-red-800');
    text.textContent = texto;
    container.classList.remove('opacity-0'); container.classList.add('opacity-100');
    setTimeout(()=>{container.classList.remove('opacity-100'); container.classList.add('opacity-0');},5000);
};

// -------------------- NAVEGAÇÃO --------------------
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', ()=>{
        document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
        document.getElementById(btn.dataset.page).classList.add('active');
        btn.classList.add('active');
    });
});

// -------------------- BUSCAR DADOS --------------------
async function fetchVendedores(){
    try{
        const res = await fetch(`${SCRIPT_URL}?sheet=Vendedores`);
        vendedores = await res.json();
        abastecerVendedores();
        renderDashboard();
    }catch(e){ console.error(e); mostrarMensagem('Erro ao carregar vendedores','erro'); }
}

async function fetchVendas(){
    try{
        const res = await fetch(`${SCRIPT_URL}?sheet=Vendas`);
        vendas = await res.json();
        renderDashboard();
    }catch(e){ console.error(e); mostrarMensagem('Erro ao carregar vendas','erro'); }
}

// -------------------- RENDER DASHBOARD --------------------
function renderDashboard(){
    const dashboardContent = document.getElementById('dashboardContent');
    if(!dashboardContent) return;
    dashboardContent.innerHTML = '';
    const totalGeralVendas = vendas.reduce((t,v)=>t+parseFloat(v.ValorTotal||0),0);
    document.getElementById('totalGeralVendas').textContent = formatarMoeda(totalGeralVendas);

    vendedores.forEach(v=>{
        const vendasVendedor = vendas.filter(x=>x.id_vendedor===v.ID);
        const comissaoPendente = vendasVendedor.filter(x=>!x.ComissaoPaga).reduce((t,x)=>t+parseFloat(x.ValorComissao||0),0);
        const comissaoPaga = vendasVendedor.filter(x=>x.ComissaoPaga).reduce((t,x)=>t+parseFloat(x.ValorComissao||0),0);

        const card = document.createElement('div');
        card.className = 'bg-white p-6 rounded-xl shadow-md';
        card.innerHTML = `
            <div class="mb-4">
                <h3 class="text-xl font-semibold text-gray-800">${v.Nome}</h3>
                <p class="text-gray-500">${v.Cidade || ''} - ${v.Bairro || ''}</p>
            </div>
            <div class="mb-4">
                <p class="text-lg font-medium text-gray-700">Comissão Pendente:</p>
                <p class="text-3xl font-bold text-red-500">${formatarMoeda(comissaoPendente)}</p>
                <p class="text-lg font-medium text-gray-700 mt-2">Comissão Paga:</p>
                <p class="text-xl font-bold text-green-500">${formatarMoeda(comissaoPaga)}</p>
            </div>
            <div class="flex space-x-2">
                ${comissaoPendente>0?`<button onclick="abrirModal(${v.ID})" class="flex-1 bg-diamantelar-apoio-1-600 hover:bg-diamantelar-apoio-1-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Pagar Comissão</button>`:''}
            </div>
        `;
        dashboardContent.appendChild(card);
    });
}

// -------------------- MODAL COMISSÃO --------------------
function abrirModal(vendedorId){
    vendedorParaPagar=vendedorId;
    const vendedor=vendedores.find(v=>v.ID===vendedorId);
    document.getElementById('nomeVendedorModal').textContent=vendedor.Nome;
    renderizarVendasPendentes();
    document.getElementById('comissaoModal').style.display='flex';
}
function fecharModal(){ document.getElementById('comissaoModal').style.display='none'; }

function renderizarVendasPendentes(){
    const container=document.getElementById('vendasPendentesContainer');
    container.innerHTML='';
    const pendentes=vendas.filter(v=>v.id_vendedor===vendedorParaPagar && !v.ComissaoPaga);
    if(pendentes.length===0){ container.innerHTML='<p class="text-center text-gray-500">Nenhuma comissão pendente.</p>'; return; }
    pendentes.forEach(v=>{
        const div=document.createElement('label');
        div.className='venda-item cursor-pointer hover:bg-gray-50 transition-colors flex items-center mb-2';
        div.innerHTML=`<input type="checkbox" value="${v.ID}" onchange="atualizarTotalPagar()" class="mr-2"><span>${v.Descricao} - ${formatarMoeda(v.ValorComissao)}</span>`;
        container.appendChild(div);
    });
}

function atualizarTotalPagar(){
    const totalEl=document.getElementById('totalComissaoPagar');
    const checkboxes=document.querySelectorAll('#vendasPendentesContainer input[type="checkbox"]:checked');
    let total=0;
    checkboxes.forEach(c=>{
        const v=vendas.find(x=>x.ID==c.value);
        if(v) total+=parseFloat(v.ValorComissao||0);
    });
    if(totalEl) totalEl.textContent=formatarMoeda(total);
}

// -------------------- GERAR PDF E PAGAR --------------------
async function gerarReciboEPagar(){
    const checkboxes=document.querySelectorAll('#vendasPendentesContainer input[type="checkbox"]:checked');
    if(checkboxes.length===0){ mostrarMensagem('Selecione pelo menos uma venda','erro'); return; }

    const vendedor=vendedores.find(v=>v.ID===vendedorParaPagar);
    const vendasSelecionadas=Array.from(checkboxes).map(c=>vendas.find(v=>v.ID==c.value));

    const { jsPDF } = window.jspdf;
    const doc=new jsPDF();
    doc.setFontSize(16);
    doc.text('Recibo de Pagamento de Comissão',105,20,{align:'center'});
    doc.setFontSize(12);
    doc.text(`Vendedor: ${vendedor.Nome}`,20,40);
    doc.text(`Forma de Pagamento: ${document.getElementById('formaPagamentoSelect').value}`,20,48);

    let y=60;
    let totalComissao=0;
    vendasSelecionadas.forEach(v=>{
        doc.text(`Venda #${v.ID}: ${v.Descricao} - ${formatarMoeda(v.ValorComissao)}`,20,y);
        y+=8;
        totalComissao+=parseFloat(v.ValorComissao||0);
    });
    doc.text(`Total de Comissão: ${formatarMoeda(totalComissao)}`,20,y+8);
    doc.save(`Recibo_Comissao_${vendedor.Nome}.pdf`);

    // MARCAR COMO PAGA
    const ids=vendasSelecionadas.map(v=>v.ID);
    await fetch(SCRIPT_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({action:'pagarComissao', ids:ids})
    });

    fecharModal();
    fetchVendas();
}

// -------------------- CADASTRO --------------------
function abastecerVendedores(){
    const select=document.getElementById('vendaVendedor');
    if(!select) return;
    select.innerHTML='<option value="">Selecione um vendedor</option>';
    vendedores.forEach(v=>{
        const opt=document.createElement('option');
        opt.value=v.ID;
        opt.textContent=v.Nome;
        select.appendChild(opt);
    });
}

document.getElementById('vendedorForm')?.addEventListener('submit', async e=>{
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
        const res=await fetch(SCRIPT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cadastrarVendedor', data:vendedor})});
        const data=await res.json();
        mostrarMensagem('Vendedor cadastrado com sucesso!');
        fetchVendedores();
        document.getElementById('vendedorForm').reset();
    }catch(e){ console.error(e); mostrarMensagem('Erro ao cadastrar vendedor','erro'); }
});

document.getElementById('vendaForm')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const venda={
        id_vendedor: document.getElementById('vendaVendedor').value,
        descricao: document.getElementById('vendaDescricao').value,
        valorTotal: document.getElementById('vendaValorTotal').value,
        valorComissao: document.getElementById('vendaValorComissao').value,
        tipoPagamento: document.getElementById('vendaTipoPagamento').value,
        valorEntrada: document.getElementById('vendaValorEntrada').value
    };
    try{
        await fetch(SCRIPT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cadastrarVenda', data:venda})});
        mostrarMensagem('Venda cadastrada com sucesso!');
        fetchVendas();
        document.getElementById('vendaForm').reset();
    }catch(e){ console.error(e); mostrarMensagem('Erro ao cadastrar venda','erro'); }
});

// -------------------- INICIALIZAÇÃO --------------------
fetchVendedores();
fetchVendas();
