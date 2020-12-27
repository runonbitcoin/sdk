/**
 * search-error.js
 */

class SearchError extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = this.markup()
        this.shadowRoot.appendChild(document.createElement('style')).textContent = this.style()
    }

    get text() {
        return this.div.innerHTML
    }

    set text(text) {
        if (text.length) {
            this.div.style.display = 'block'
            this.div.innerHTML = text
        } else {
            this.div.style.display = 'nonce'
            this.div.innerHTML = ''
        }
    }

    markup() {
        return `
            <div>
            </div>
        `
    }

    style() {
        return `
            div {
                width: 100%;
                display: flex;
                align-items: center;
                display: none;
                color: #f80;
            }
        `
    }

    get div() { return this.shadowRoot.querySelector('div') }
}

customElements.define('search-error', SearchError)
