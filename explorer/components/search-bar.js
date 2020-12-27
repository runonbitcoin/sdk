/**
 * search-bar.js
 */

class SearchBar extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = this.markup()
        this.shadowRoot.appendChild(document.createElement('style')).textContent = this.style()
        this.input.addEventListener('input', this.onInput.bind(this))
        this.input.addEventListener('keyup', this.onKeyUp.bind(this))
    }

    get value() { return this.input.value }
    set value(value) { this.input.value = value }

    onInput(event) {
        this.dispatchEvent(new Event('change'))
    }

    onKeyUp(event) {
        if (event.key === 'Enter') {
            this.dispatchEvent(new Event('submit'))
        }
    }

    connectedCallback() {
        this.input.focus()
    }

    markup() {
        return `
            <div>
                <span>
                    <img src="images/search.svg"/>
                    <input type="text" placeholder="Search for an address or identifier..."/>
                </span>
            </div>
        `
    }

    style() {
        return `
            div {
                width: 100%;
                height: 38px;
                margin: 10px auto 0 auto;
                padding: 16px;
                border-radius: 20px;
                box-shadow: 0px 0px 4px 4px #ddd;
            }

            span {
                display: flex;
                align-items: center;
            }

            img {
                width: 40px;
                height: 40px;
                opacity: 0.2;
            }

            input {
                width: 100%;
                height: 100%;
                margin-left: 10px;
                font-size: 15pt;
                border: 0;
                outline: none;
            }

            input::placeholder {
                opacity: 0.4;
            }
        `
    }

    get input() { return this.shadowRoot.querySelector('input') }
}

customElements.define('search-bar', SearchBar)
