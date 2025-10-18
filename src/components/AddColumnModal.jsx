import React, { useState, useEffect } from 'react';
import '../styles/AddColumnModal.css';

const AddColumnModal = ({ open, defaultTitle = '', onCancel, onSave }) => {
    const [title, setTitle] = useState(defaultTitle);

    useEffect(() => {
        if (open) {
            setTitle(defaultTitle || '');
        }
    }, [open, defaultTitle]);

    if (!open) return null;

    const handleSave = () => {
        onSave({ title: title.trim() });
    };

    return (
        <div className="stm-overlay" role="dialog" aria-modal="true" aria-label="Add Column">
            <div className="stm-modal">
                <div className="stm-header">Add Column</div>

                <div className="stm-body">
                    <label className="stm-label">Column name</label>
                    <input
                        className="stm-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Clinical, Generalist"
                    />
                </div>

                <div className="stm-actions">
                    <button className="stm-btn stm-cancel" onClick={onCancel}>Cancel</button>
                    <button
                        className="stm-btn stm-primary"
                        onClick={handleSave}
                        disabled={!title.trim()}
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddColumnModal;