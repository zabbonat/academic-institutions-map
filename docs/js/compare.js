(function() {
    const floatBtn = document.getElementById('compare-float-btn');
    const compareModal = document.getElementById('compare-modal');
    const compareCount = document.getElementById('compare-count');
    const closeCompare = document.getElementById('close-compare');
    const compareView = document.getElementById('compare-content-view');

    window.addEventListener('compareListUpdated', updateUI);

    floatBtn.onclick = () => {
        renderComparison();
        compareModal.classList.remove('hidden');
    };

    closeCompare.onclick = () => {
        compareModal.classList.add('hidden');
    };

    function updateUI() {
        const count = window.appState.compareList.length;
        compareCount.textContent = count;
        if (count > 0) {
            floatBtn.classList.remove('hidden');
        } else {
            floatBtn.classList.add('hidden');
        }
    }

    function renderComparison() {
        const ids = window.appState.compareList;
        const data = ids.map(id => window.appState.dataById[id]).filter(d => d);

        if (data.length === 0) {
            compareView.innerHTML = '<div style="grid-column: span 2; text-align: center; padding: 40px;">No institutions selected for comparison.</div>';
            return;
        }

        let html = '';
        
        data.forEach((inst, i) => {
            const otherInst = data[1 - i];
            html += `
                <div class="compare-col">
                    <div class="compare-item-header">
                        <h2 class="inst-name">${inst.n}</h2>
                        <div class="inst-meta">${inst.t} • ${inst.c}</div>
                    </div>

                    <div class="compare-row">
                        <div class="compare-label">Institution Type</div>
                        <div class="compare-value">${inst.t}</div>
                    </div>

                    <div class="compare-row">
                        <div class="compare-label">Ownership</div>
                        <div class="compare-value">${inst.o}</div>
                    </div>

                    <div class="compare-row">
                        <div class="compare-label">Country</div>
                        <div class="compare-value">${inst.c}</div>
                    </div>

                    <div class="compare-row">
                        <div class="compare-label">Works Count</div>
                        <div class="compare-value ${otherInst && inst.w > otherInst.w ? 'highlight' : ''}">${(inst.w || 0).toLocaleString()}</div>
                    </div>

                    <div class="compare-row">
                        <div class="compare-label">Citations</div>
                        <div class="compare-value ${otherInst && inst.cb > otherInst.cb ? 'highlight' : ''}">${(inst.cb || 0).toLocaleString()}</div>
                    </div>

                    <div class="compare-row">
                        <div class="compare-label">h-index</div>
                        <div class="compare-value ${otherInst && inst.h > otherInst.h ? 'highlight' : ''}">${inst.h || 0}</div>
                    </div>

                    <div class="compare-row">
                        <div class="compare-label">Shared Related Institutions</div>
                        <div class="compare-value">${getSharedLineageCount(inst, otherInst)} shared IDs</div>
                    </div>

                    <div class="compare-row">
                        <div class="compare-label">Disciplines</div>
                        <div class="tag-list" style="margin-top: 8px;">
                            ${(inst.f || []).slice(0, 10).map(f => `<span class="tag">${f}</span>`).join('')}
                            ${inst.f && inst.f.length > 10 ? '<span class="tag">...</span>' : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        compareView.innerHTML = html;
    }

    function getSharedLineageCount(inst1, inst2) {
        if (!inst1 || !inst2 || !inst1.l || !inst2.l) return 0;
        const set1 = new Set(inst1.l);
        const shared = inst2.l.filter(id => set1.has(id));
        return shared.length;
    }
})();
