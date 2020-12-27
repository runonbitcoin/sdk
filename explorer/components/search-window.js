/**
 * search-window.js
 */

class SearchWindow extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = this.markup()
        this.shadowRoot.appendChild(document.createElement('style')).textContent = this.style()
        this.networkSwitcher.addEventListener('change', this.onChangeNetwork.bind(this))
        this.searchBar.addEventListener('change', this.onChangeQuery.bind(this))
        this.searchBar.addEventListener('submit', this.onSubmitQuery.bind(this))
        this.exploreOwner.addEventListener('navigate', this.navigate.bind(this))
        this.exploreCreation.addEventListener('navigate', this.navigate.bind(this))
        this.exploreTx.addEventListener('navigate', this.navigate.bind(this))
        window.addEventListener('popstate', () => this.loadQueryParams())
        this.loadQueryParams()
    }

    loadQueryParams() {
        const [query, network] = [getQueryParam('query'), getQueryParam('network')]
        if (typeof network !== 'undefined') this.networkSwitcher.network = network
        if (typeof query !== 'undefined') { this.searchBar.value = query; this.search() }
    }

    navigate(event) {
        this.searchBar.value = event.detail.query
        this.networkSwitcher.network = event.detail.network
        this.search()
    }

    onChangeNetwork() {
        this.exploreOwner.network = this.networkSwitcher.network
        this.exploreCreation.network = this.networkSwitcher.network
        this.exploreTx.network = this.networkSwitcher.network
        this.search()
    }

    onChangeQuery() {
        this.searchError.text = ''
    }

    onSubmitQuery() {
        this.search()
    }

    search() {
        this.searchError.text = ''
        this.exploreOwner.address = ''
        this.exploreCreation.location = ''
        this.exploreTx.txid = ''

        const query = parseQuery(this.searchBar.value, this.networkSwitcher.network)

        const params = `?query=${encodeURIComponent(this.searchBar.value)}&network=${this.networkSwitcher.network}`
        if (!window.location.href.endsWith(params)) window.history.pushState({}, '', params)

        if (query.address) {
            this.exploreOwner.address = query.address
            return
        }

        if (query.location) {
            this.exploreCreation.location = query.location
            return
        }

        if (query.txid) {
            this.exploreTx.txid = query.txid
            return
        }

        if (query.error) {
            this.searchError.text = query.error
            return
        }
    }

    markup() {
        return `
            <div>
                <network-switcher></network-switcher>
                <search-bar></search-bar>

                <div id="results-container">
                    <search-error></search-error>
                    <explore-owner></explore-owner>
                    <explore-creation></explore-creation>
                    <explore-tx></explore-tx>
                </div>
            </div>
        `
    }

    style() {
        return `
            div {
                width: 100%;
                display: flex;
                align-items: center;
                flex-direction: column;
            }

            search-bar {
                width: 100%;
            }

            #results-container {
                width: 80%;
                margin-top: 40px;
                font-size: 14pt;
                display: flex;
                align-items: center;
                flex-direction: column;
            }

            explore-owner {
                width: 100%;
            }

            explore-creation {
                width: 100%;
            }

            explore-tx {
                width: 100%;
            }
        `
    }

    get networkSwitcher() { return this.shadowRoot.querySelector('network-switcher') }
    get searchBar() { return this.shadowRoot.querySelector('search-bar') }
    get searchError() { return this.shadowRoot.querySelector('search-error') }
    get exploreOwner() { return this.shadowRoot.querySelector('explore-owner') }
    get exploreCreation() { return this.shadowRoot.querySelector('explore-creation') }
    get exploreTx() { return this.shadowRoot.querySelector('explore-tx') }
}

customElements.define('search-window', SearchWindow)
