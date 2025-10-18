import React, { useEffect, useState } from 'react';
import '../styles/AddColumnModal.css';

const SaveTemplateTitleModal = ({ open, defaultName, onCancel, onSave }) => {
    const [name, setName] = useState(defaultName || '');

    useEffect(() => {
        if (open) setName(defaultName || '');
    }, [open, defaultName]);

    if (!open) return null;

    return (
        <div className="stm-overlay" role="dialog" aria-modal="true" aria-label="Save Template">
            <div className="stm-modal" style={{ maxWidth: 460 }}>
                <div className="stm-header">Save Template</div>

                <div className="stm-body">
                    <label className="stm-label">Template name</label>
                    <input
                        className="stm-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Template name"
                    />
                </div>

                <div className="stm-actions">
                    <button className="stm-btn stm-cancel" onClick={onCancel}>Cancel</button>
                    <button
                        className="stm-btn stm-primary"
                        onClick={() => onSave(name.trim())}
                        disabled={!name.trim()}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveTemplateTitleModal;