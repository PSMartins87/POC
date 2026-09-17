import React, { useEffect, useState } from 'react';
import { securityService } from './api';

// Tipagens atualizadas com os novos campos do backend
interface ActiveSession {
  sessionId: string;
  ipAddress: string;
  browser: string;
  os: string;
  city: string;
  createdAt: string | number | number[];
  status: string;       // NOVO: 'ACTIVE', 'EXPIRED', 'LOGOUT', 'REVOKE_SESSION'
  bffOrigin: string;    // NOVO: 'bff-admin', 'bff-web', etc.
}

interface UserDevice {
  id: string;
  ipAddress: string;
  browser: string;
  os: string;
  city: string;
  lastLogin: string | number | number[];
}

export const SecurityPanel: React.FC = () => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Controle das abas de visualização
  const [activeTab, setActiveTab] = useState<'ativas' | 'historico'>('ativas');

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, devicesRes] = await Promise.all([
        securityService.getSessions(),
        securityService.getDevices(),
      ]);
      
      setSessions(sessionsRes.data.sessions || []);
      setDevices(devicesRes.data.devices || []);
    } catch (error) {
      console.error('Erro ao buscar dados de segurança.', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (dataOriginal: any) => {
    if (!dataOriginal) return 'N/A';
    
    let data = dataOriginal;
    if (typeof dataOriginal === 'number' && dataOriginal < 10000000000) {
      data = dataOriginal * 1000; 
    } else if (Array.isArray(dataOriginal)) {
      const [year, month, day, hour, minute, second = 0] = dataOriginal;
      data = new Date(year, month - 1, day, hour, minute, second);
    }

    const dataObj = new Date(data);
    if (isNaN(dataObj.getTime())) return 'Data inválida';

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(dataObj);
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!window.confirm('Tem certeza que deseja desconectar esta sessão?')) return;

    try {
      await securityService.revokeSession(sessionId);
      alert('Sessão revogada com sucesso! O dispositivo será desconectado.');
      
      // Em vez de remover, atualizamos o status para Soft Delete no frontend
      setSessions(sessions.map(s => 
        s.sessionId === sessionId ? { ...s, status: 'REVOKE_SESSION' } : s
      ));
    } catch (error) {
      console.error('Erro ao revogar sessão', error);
      alert('Erro ao tentar revogar a sessão.');
    }
  };

  const handleForgetDevice = async (deviceId: string) => {
    if (!window.confirm('Tem certeza que deseja esquecer este dispositivo? Você precisará realizar login novamente nele.')) return;

    try {
      await securityService.forgetDevice(deviceId);
      alert('Dispositivo esquecido com sucesso!');
      setDevices(devices.filter(d => d.id !== deviceId));
    } catch (error) {
      console.error('Erro ao esquecer dispositivo', error);
      alert('Erro ao tentar esquecer o dispositivo.');
    }
  };

  // Separa as sessões com base no status retornado pelo backend
  const sessoesAtivas = sessions.filter(s => s.status === 'ACTIVE');
  const sessoesInativas = sessions.filter(s => s.status !== 'ACTIVE');

  // Helper para exibir o status formatado no histórico
  const renderStatus = (status: string) => {
    switch(status) {
      case 'EXPIRED': return 'Expirada pelo tempo';
      case 'LOGOUT': return 'Logout manual';
      case 'REVOKE_SESSION': return 'Encerrada remotamente';
      default: return 'Inativa';
    }
  };

  if (loading) return <p>Carregando painel de segurança...</p>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h2>Painel de Controle de Acessos</h2>
      <p>Gerencie seus dispositivos e histórico de acessos.</p>

      {/* Seção de Sessões com Abas */}
      <section style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
          <button 
            onClick={() => setActiveTab('ativas')}
            style={{ 
              padding: '8px 16px', border: 'none', background: 'transparent', 
              cursor: 'pointer', fontWeight: activeTab === 'ativas' ? 'bold' : 'normal',
              color: activeTab === 'ativas' ? '#2563eb' : '#666', fontSize: '16px'
            }}
          >
            Sessões Ativas ({sessoesAtivas.length})
          </button>
          <button 
            onClick={() => setActiveTab('historico')}
            style={{ 
              padding: '8px 16px', border: 'none', background: 'transparent', 
              cursor: 'pointer', fontWeight: activeTab === 'historico' ? 'bold' : 'normal',
              color: activeTab === 'historico' ? '#2563eb' : '#666', fontSize: '16px'
            }}
          >
            Histórico de Acessos
          </button>
        </div>

        {activeTab === 'historico' && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', padding: '12px', borderRadius: '6px', marginTop: '15px', color: '#991b1b', fontSize: '14px' }}>
            <strong>Não reconhece algum acesso passado?</strong> Recomendamos a alteração imediata da sua senha e a ativação da autenticação em duas etapas (MFA).
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '10px', borderBottom: '2px solid #ccc' }}>Dispositivo e Origem</th>
              <th style={{ padding: '10px', borderBottom: '2px solid #ccc' }}>Localização (IP)</th>
              <th style={{ padding: '10px', borderBottom: '2px solid #ccc' }}>Criada em</th>
              <th style={{ padding: '10px', borderBottom: '2px solid #ccc' }}>Ação / Status</th>
            </tr>
          </thead>
          <tbody>
            {(activeTab === 'ativas' ? sessoesAtivas : sessoesInativas).length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '15px', textAlign: 'center', color: '#666' }}>Nenhuma sessão encontrada nesta categoria.</td></tr>
            ) : (
              (activeTab === 'ativas' ? sessoesAtivas : sessoesInativas).map((session) => (
                <tr key={session.sessionId} style={{ borderBottom: '1px solid #eee' }}>
                  
                  {/* Coluna de Dispositivo com Badge de Origem */}
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <strong>{session.os}</strong>
                      <span style={{ fontSize: '0.85em', color: '#666' }}>{session.browser}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75em', fontWeight: 'bold',
                        backgroundColor: session.bffOrigin === 'bff-admin' ? '#4f46e5' : '#10b981', color: 'white'
                      }}>
                        {session.bffOrigin === 'bff-admin' ? 'Painel Admin' : 'Portal Web'}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: '10px' }}>
                    {session.city} <br/>
                    <small>{session.ipAddress}</small>
                  </td>
                  
                  <td style={{ padding: '10px' }}>
                    {formatarData(session.createdAt)}
                  </td>
                  
                  {/* Renderização Condicional da Ação ou Status */}
                  <td style={{ padding: '10px' }}>
                    {activeTab === 'ativas' ? (
                      <button 
                        onClick={() => handleRevokeSession(session.sessionId)}
                        style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Desconectar
                      </button>
                    ) : (
                      <span style={{ color: '#6b7280', fontSize: '0.85em', fontWeight: 'bold' }}>
                        {renderStatus(session.status)}
                      </span>
                    )}
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Tabela de Dispositivos Conhecidos */}
      <section style={{ marginTop: '50px' }}>
        <h3>Aparelhos de Confiança</h3>
        <p style={{ fontSize: '14px', color: '#666' }}>Dispositivos que você marcou como seguros ou realizou login recentemente.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          {/* ... O conteúdo da sua tabela de devices permanece o mesmo aqui ... */}
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '10px', borderBottom: '2px solid #ccc' }}>Dispositivo</th>
              <th style={{ padding: '10px', borderBottom: '2px solid #ccc' }}>Localização</th>
              <th style={{ padding: '10px', borderBottom: '2px solid #ccc' }}>Último Acesso</th>
              <th style={{ padding: '10px', borderBottom: '2px solid #ccc' }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '10px' }}>Nenhum dispositivo conhecido.</td></tr>
            ) : (
              devices.map((device) => (
                <tr key={device.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>
                    <strong>{device.os}</strong> - {device.browser}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {device.city} ({device.ipAddress})
                  </td>
                  <td style={{ padding: '10px' }}>
                    {formatarData(device.lastLogin)}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <button 
                      onClick={() => handleForgetDevice(device.id)}
                      style={{ padding: '6px 12px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Esquecer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};