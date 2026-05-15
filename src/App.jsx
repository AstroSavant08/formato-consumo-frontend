import { useState } from 'react';
import ConsumoAnio from './components/ConsumoAnio';
import FormatoPedido from './components/FormatoPedido';
import RegistroEntregas from './components/RegistroEntregas';

const TABS = [
    { id: 'consumo', label: 'Consumo del Año', icon: 'bi-calendar3' },
    { id: 'pedido', label: 'Formato de Pedido', icon: 'bi-cart3' },
    { id: 'entregas', label: 'Registro Control Entregas', icon: 'bi-clipboard-check' },
];

export default function App() {
    const [activeTab, setActiveTab] = useState('consumo');

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Navbar */}
            <nav className="app-navbar d-flex align-items-center gap-3">
                <div className="navbar-logo-wrap">
                    <i className="bi bi-boxes" style={{ fontSize: '1.25rem', color: '#f59e0b' }} />
                </div>
                <div>
                    <div className="brand-title">Formato de Consumo</div>
                    <div className="brand-subtitle">Gestión de Productos A &amp; C</div>
                </div>
                <div className="ms-auto">
                    <div className="navbar-date-chip">
                        <i className="bi bi-calendar2-check" />
                        {new Date().toLocaleDateString('es-CO', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                </div>
            </nav>

            {/* Tabs */}
            <div className="main-tabs">
                <ul className="nav" role="tablist">
                    {TABS.map(tab => (
                        <li key={tab.id} className="nav-item">
                            <button
                                className={`nav-link${activeTab === tab.id ? ' active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                                role="tab"
                            >
                                <span className="tab-icon">
                                    <i className={`bi ${tab.icon}`} />
                                </span>
                                <span className="d-none d-sm-inline">{tab.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Content */}
            <main className="main-content flex-grow-1">
                {activeTab === 'consumo' && <ConsumoAnio />}
                {activeTab === 'pedido' && <FormatoPedido />}
                {activeTab === 'entregas' && <RegistroEntregas />}
            </main>

            {/* Footer */}
            <footer className="app-footer">
                <i className="bi bi-boxes" style={{ color: '#cbd5e1' }} />
                Formato de Consumo &mdash; Gestión Interna de Suministros
                <i className="bi bi-c-circle" style={{ color: '#cbd5e1' }} />
                {new Date().getFullYear()}
            </footer>
        </div>
    );
}
