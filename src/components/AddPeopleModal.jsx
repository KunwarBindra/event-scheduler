import React, { useEffect, useMemo, useState } from 'react';
import '../styles/AddColumnModal.css';

const AddPeopleModal = ({
    open,
    allUsers = [],
    initialSelected = [],
    resourceTitle = '',
    onCancel,
    onSave, // onSave(selectedArray)
}) => {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(new Set(initialSelected));

    useEffect(() => {
        if (open) {
            setQuery('');
            setSelected(new Set(initialSelected));
        }
    }, [open, initialSelected]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return allUsers;
        return allUsers.filter(u => u.toLowerCase().includes(q));
    }, [allUsers, query]);

    const toggle = (name) => {
        const next = new Set(selected);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        setSelected(next);
    };

    if (!open) return null;

    return (
        <div className="stm-overlay" role="dialog" aria-modal="true" aria-label="Add People">
            <div className="stm-modal" style={{ maxWidth: 520 }}>
                <div className="stm-header">Add People{resourceTitle ? ` – ${resourceTitle}` : ''}</div>

                <div className="stm-body">
                    <label className="stm-label">Search users</label>
                    <input
                        className="stm-input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Type to filter…"
                    />

                    <div className="stm-divider" />

                    <div style={{ maxHeight: 260, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                        {filtered.length === 0 ? (
                            <div style={{ padding: 12, color: '#6b7280' }}>No matches</div>
                        ) : (
                            filtered.map((name) => (
                                <label
                                    key={name}
                                    className="stm-radio"
                                    style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, padding: '10px 12px' }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.has(name)}
                                        onChange={() => toggle(name)}
                                    />
                                    <span>{name}</span>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                <div className="stm-actions">
                    <button className="stm-btn stm-cancel" onClick={onCancel}>Cancel</button>
                    <button
                        className="stm-btn stm-primary"
                        onClick={() => onSave(Array.from(selected))}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddPeopleModal;