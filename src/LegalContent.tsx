export type LegalDocument='terms'|'privacy'|'ai';

export const legalDocumentTitles:Record<LegalDocument,string>={
 terms:'Termos de Uso',
 privacy:'Aviso de Privacidade e LGPD',
 ai:'Aviso sobre o Uso de Inteligência Artificial'
};

export function TermsContent(){return <>
 <p><b>Versão 0.2 · 22 de julho de 2026.</b></p>
 <h2>1. Finalidade</h2>
 <p>O Treino ENAMED é um protótipo independente de estudo formativo para estudantes de Medicina. Não é produto oficial do INEP ou do MEC, não possui vínculo institucional e não atribui nota acadêmica, certificação ou garantia de desempenho.</p>
 <h2>2. Limites educacionais e clínicos</h2>
 <p>Questões, comentários e indicadores destinam-se exclusivamente ao aprendizado. O conteúdo não substitui professores, fontes primárias, protocolos vigentes nem julgamento profissional e não deve orientar o cuidado de pacientes reais.</p>
 <h2>3. Conta e segurança</h2>
 <p>O usuário deve informar um e-mail ao qual tenha acesso, manter seu link de autenticação protegido e não utilizar a conta de terceiros. Atividades anômalas ou que comprometam a segurança poderão resultar em bloqueio preventivo.</p>
 <h2>4. Uso aceitável</h2>
 <ul><li>Não tentar acessar dados, contas ou funções sem autorização.</li><li>Não interferir no funcionamento, contornar limites ou automatizar abuso do serviço.</li><li>Não inserir dados identificáveis de pacientes ou informações clínicas sigilosas.</li><li>Não enviar materiais protegidos ou de circulação restrita sem autorização.</li></ul>
 <h2>5. Questões e estados editoriais</h2>
 <p>Os itens podem ser revisados por especialista, verificados automaticamente ou classificados como experimentais. O estado editorial deve ser exibido no aplicativo. Mesmo itens revisados podem conter falhas; o usuário deve reportar inconsistências quando o recurso estiver disponível.</p>
 <h2>6. Disponibilidade e alterações</h2>
 <p>Por ser um protótipo, recursos podem mudar, ser interrompidos ou apresentar indisponibilidade. Alterações materiais destes termos exigirão novo aviso e nova manifestação do usuário.</p>
 <h2>7. Responsabilidade</h2>
 <p>Resultados dependem do uso, da cobertura do banco e da qualidade dos itens. O aplicativo não promete aprovação, proficiência ou equivalência com a prova oficial.</p>
 <h2>8. Vigência e contato</h2>
 <p>Estes termos passam a valer quando aceitos. A identificação completa do responsável e o canal para solicitações deverão ser publicados antes da abertura do piloto a estudantes.</p>
 </>}

export function PrivacyContent(){return <>
 <p><b>Versão 0.2 · 22 de julho de 2026.</b></p>
 <h2>1. Dados tratados</h2>
 <p>No modo demonstrativo, respostas e preferências ficam neste navegador. Com login, o sistema poderá tratar identificador da conta, nome, e-mail, perfil de acesso, respostas, confiança, tempo de resposta, revisões e registros técnicos de segurança.</p>
 <h2>2. Finalidades</h2>
 <ul><li>Autenticar o usuário e manter a sessão.</li><li>Salvar tentativas e apresentar progresso individual.</li><li>Organizar revisão e personalizar o treino.</li><li>Proteger o serviço e diagnosticar falhas.</li><li>Produzir indicadores agregados de funcionamento e qualidade.</li></ul>
 <h2>3. Compartilhamento e operadores</h2>
 <p>Supabase e Render são utilizados para autenticação, banco de dados e hospedagem. Provedores de inteligência artificial podem receber apenas o conteúdo necessário à geração e verificação de questões; dados pessoais de estudantes não devem ser enviados nesses fluxos.</p>
 <h2>4. Pesquisa</h2>
 <p>O uso do aplicativo não autoriza automaticamente o emprego dos dados em pesquisa científica. Pesquisa exigirá base ética e jurídica própria, informação específica e, quando aplicável, consentimento e avaliação do sistema CEP/CONEP.</p>
 <h2>5. Retenção e segurança</h2>
 <p>O acesso ao banco é limitado por perfil e políticas de segurança. Prazos de retenção, rotina de exclusão, canal do titular e identificação do controlador precisam ser formalizados antes do piloto com estudantes.</p>
 <h2>6. Direitos do titular</h2>
 <p>Nos termos da LGPD, o titular poderá solicitar confirmação, acesso, correção, informação sobre compartilhamento e, quando cabível, portabilidade, oposição, anonimização ou eliminação.</p>
 </>}

export function AIUseContent(){return <>
 <p><b>Versão 0.2 · 22 de julho de 2026.</b></p>
 <p>Inteligência artificial poderá auxiliar na geração, classificação, verificação e reparo de questões. Esses sistemas podem produzir erros, referências inadequadas, vieses ou interpretações incorretas.</p>
 <h2>Estados editoriais</h2>
 <ul><li><b>Revisada por especialista:</b> houve decisão humana registrada.</li><li><b>Verificada automaticamente:</b> passou por verificações automáticas, sem equivaler a revisão humana.</li><li><b>Experimental:</b> verificações ou curadoria ainda estão incompletas.</li></ul>
 <h2>O que a IA não decide</h2>
 <p>A IA não atribui revisão humana, não converte desempenho em avaliação oficial e não deve responder por decisões clínicas reais. Questões geradas não devem ser liberadas aos estudantes sem o nível de revisão definido pela política editorial.</p>
 <h2>Dados pessoais</h2>
 <p>Respostas identificadas, e-mails e demais dados pessoais de estudantes não devem ser incluídos em solicitações aos modelos de IA usados para elaborar questões.</p>
 </>}

export function LegalContent({document}:{document:LegalDocument}){
 if(document==='terms')return <TermsContent/>;
 if(document==='privacy')return <PrivacyContent/>;
 return <AIUseContent/>;
}
