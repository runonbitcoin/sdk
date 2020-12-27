/**
 * network-switcher.js
 */

class NetworkSwitcher extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = this.markup()
        this.shadowRoot.appendChild(document.createElement('style')).textContent = this.style()
        this.addEventListener('click', this.onClick.bind(this))
    }

    get network() { return this.getAttribute('network') }
    set network(value) { return this.setAttribute('network', value) }

    connectedCallback() {
       this.network = this.network || 'main'
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return

        switch (name) {
            case 'network': {
                if (newValue === 'main') this.networkName.classList.remove('flipped')
                if (newValue === 'test') this.networkName.classList.add('flipped')
                this.dispatchEvent(new Event('change'))
            } break;
        }
    }

    onClick() {
        this.network = this.network === 'main' ? 'test' : 'main'
    }

    markup() {
        return `
            <div>
                <span id="slot-mask">
                    <span id="network-name" hidden-slot-text="Testnet">Mainnet</span>
                </span>
            </div>
        `
    }

    style() {
        return `
            div {
                text-align: center;
            }

            #slot-mask {
                display: block;
                overflow: hidden;
            }
            
            #network-name {
                position: relative;
                display: inline-block;
                transition: transform 0.2s cubic-bezier(.57,0,0.2,1);
                cursor: pointer;
                text-decoration: underline;
                font-size: 14pt;
                color: #999;
                font-weight: 800;
            }

            #network-name::before {
                content: attr(hidden-slot-text);
                position: absolute;
                top: 120%;
                text-decoration: underline;
            }

            #network-name.flipped {
                transform: translate(0, -120%);
                text-decoration: underline;
            }
        `
    }

    get networkName() { return this.shadowRoot.getElementById('network-name') }

    static get observedAttributes() { return ['network'] }
}

customElements.define('network-switcher', NetworkSwitcher)
