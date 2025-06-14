// src/leadService.js

import pool from '../db.js';

export async function fetchLeadData(tipo, valor) {
    const mapCampos = { cpf_cnpj: 'cpf_cnpj', nome_completo: 'nome_completo', numero_telefone: 'numero_telefone', email: 'email' };
    if (!mapCampos[tipo]) { return null; }
    const valorLimpo = ['cpf_cnpj', 'numero_telefone'].includes(tipo) ? valor.replace(/\D/g, '') : valor;

    try {
        let tipoBuscaFinal = tipo;
        let valorBuscaFinal = valorLimpo;

        if (tipo === 'numero_telefone') {
            const buscaTelefoneSql = `
                SELECT l.cpf_cnpj, l.nome_completo
                FROM lead_telefones lt
                JOIN lead l ON l.lead_id = lt.lead_id
                WHERE lt.numero_telefone = $1`;
            
            const { rows } = await pool.query(buscaTelefoneSql, [valorLimpo]);

            if (rows.length === 0) return null;
            if (rows.length > 1) return { multiplos_cpfs: rows };

            tipoBuscaFinal = 'cpf_cnpj';
            valorBuscaFinal = rows[0].cpf_cnpj;
        
        } else if (tipo === 'email') {
            const buscaEmailSql = `
                SELECT l.cpf_cnpj, l.nome_completo
                FROM lead_emails le
                JOIN lead l ON l.lead_id = le.lead_id
                WHERE le.email ILIKE $1`;
            
            const { rows } = await pool.query(buscaEmailSql, [`%${valorLimpo}%`]);

            if (rows.length === 0) return null;
            if (rows.length > 1) return { multiplos_cpfs: rows };
            
            tipoBuscaFinal = 'cpf_cnpj';
            valorBuscaFinal = rows[0].cpf_cnpj;
        }
        
        const buscaPrincipalSql = `
            SELECT l.*, o.descricao AS ocupacao,
                TO_CHAR(l.data_nasc, 'DD/MM/YYYY') AS data_nasc_formatada
            FROM lead l
            LEFT JOIN ocupacao o ON o.id_ocupacao = l.id_ocupacao
            WHERE l.${tipoBuscaFinal === 'nome_completo' ? 'nome_completo' : 'cpf_cnpj'} ${tipoBuscaFinal === 'nome_completo' ? 'ILIKE' : '='} $1
            LIMIT 1`;
        
        const params = [tipoBuscaFinal === 'nome_completo' ? `%${valorBuscaFinal}%` : valorBuscaFinal];
        const { rows: leadRows } = await pool.query(buscaPrincipalSql, params);

        if (leadRows.length === 0) return null;

        const lead = leadRows[0];
        const leadId = lead.lead_id;

        const [telQ, emQ, parQ, endQ] = await Promise.all([
            pool.query(`SELECT numero_telefone AS numero, situacao FROM lead_telefones WHERE lead_id = $1`, [leadId]),
            pool.query(`SELECT email FROM lead_emails WHERE lead_id = $1`, [leadId]),
            pool.query(`SELECT
                            pl.cpf_cnpj_parente as cpf_parente,
                            COALESCE(pl.nome_parente, l2.nome_completo) as nome_parente,
                            pl.grau_parentesco as grau,
                            pl.participacao_cnpj as participacao
                        FROM
                            possiveis_leads pl
                        LEFT JOIN lead l2 ON l2.cpf_cnpj = pl.cpf_cnpj_parente 
                        WHERE pl.lead_id = $1`, [leadId]),
            pool.query(`SELECT endereco_rua || ', ' || bairro || ', ' || cidade || '/' || estado || ' - CEP ' || cep AS endereco FROM endereco WHERE lead_id = $1 LIMIT 1`, [leadId])
        ]);
        
        // --- LÓGICA SIMPLIFICADA USANDO APENAS POSSIVEIS_LEADS ---

        const sociedadesFinal = parQ.rows
            .filter(r => r.grau === 'PARTICIPACAO_SOCIETARIA')
            .map(s => ({
                razao_social: s.nome_parente,
                cnpj: s.cpf_parente,
                participacao: s.participacao ? `${s.participacao}%` : '-'
            }));

        const parentesFiltrados = parQ.rows
            .filter(r => r.grau !== 'PARTICIPACAO_SOCIETARIA');

        return {
            cpf:           lead.cpf_cnpj            ?? '-',
            nome_completo: lead.nome_completo       ?? '-',
            data_nasc:     lead.data_nasc_formatada ?? '-',
            sexo:          lead.sexo === 'M' ? 'Masculino' : lead.sexo === 'F' ? 'Feminino' : '-',
            nome_mae:      lead.nome_mae            ?? '-',
            falecido:      lead.falecido            ? 'SIM' : 'NÃO',
            ocupacao:      lead.ocupacao            ?? '-',
            email:         emQ.rows[0]?.email       ?? '-',
            telefones:     telQ.rows.map(r => ({ numero: r.numero ?? '-', situacao: r.situacao ?? '-' })),
            parentes:      parentesFiltrados.map(r => ({
                                nome_parente: r.nome_parente ?? '-',
                                cpf_parente:  r.cpf_parente  ?? '-',
                                grau:         r.grau         ?? '-'
                           })),
            renda:         lead.renda               ?? '-',
            risco_credito: lead.risco_credito       ?? '-',
            endereco:      endQ.rows[0]?.endereco   ?? '-',
            sociedade:     sociedadesFinal
        };

    } catch (err) {
        console.error('❌ Erro em fetchLeadData:', err);
        throw err;
    }
}