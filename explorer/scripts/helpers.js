/**
 * helpers.js
 */

function formatAge(date) {
    const hoursAgo = Math.floor((new Date() - date) / (1000 * 60 * 60))
    const daysAgo = Math.floor(hoursAgo / 24)
    if (hoursAgo <= 0) return  'Recently updated'
    else if (hoursAgo < 24) return `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`
    else return `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`
}

function formatMethod(rawtx) {
    const metadata = Run.util.metadata(rawtx)

    if (metadata.exec.length > 1) return 'multiple updates'

    const op = metadata.exec[0].op

    if (op === 'NEW') {
        const args = metadata.exec[0].data[1]
        return `init(${args.map(x => '...').join(', ')})`
    }
    
    if (op === 'CALL') {
        const method = metadata.exec[0].data[1]
        const args = metadata.exec[0].data[2]
        return `${method}(${args.map(x => '...').join(', ')})`
    }

    return 'complex updates'
}

function extractEmoji(type) {
    // Primary emoji location
    if (typeof type.metadata === 'object' && typeof type.metadata.emoji === 'string') return type.metadata.emoji
    // Legacy emoji support
    if (typeof type.icon === 'object' && typeof type.icon.emoji === 'string') return type.icon
    if (typeof type.icon === 'string') return type.icon
    // Empty string = no emoji
    return ''
}

function extractImage(type) {
    // Primary image location
    if (typeof type.metadata === 'object' && typeof type.metadata.image === 'object') return type.metadata.image
    // Legacy image support
    if (typeof type.icon === 'object' && typeof type.icon.image === 'object') return type.icon.image
    // Empty string = no image
    return ''
}

function extractIcon(creation) {
    const image = extractImage(creation) || extractImage(creation.constructor)
    if (image) return `<img src="data:${image.mediaType};base64, ${image.base64Data}"></img>`

    const emoji = twemoji.parse(extractEmoji(creation) || extractEmoji(creation.constructor))
    if (emoji) return emoji

    return ''
}

function extractName(creation) {
    const valid = name => typeof name === 'string' && name.length > 0
    // Primary
    if (typeof creation.metadata === 'object' && valid(creation.metadata.name)) return creation.metadata.name
    // Class name if class
    if (creation instanceof Run.Code) return creation.name
    // Primary on class
    if (typeof creation.constructor.metadata === 'object' && valid(creation.constructor.metadata.name)) return creation.constructor.metadata.name
    // Class name if instance
    return creation.constructor.name
}

function getQueryParam(name) {
    const query = window.location.search.substring(1)
    const params = query.split('&')
    const param = params.find(param => decodeURIComponent(param.split('=')[0]) === name)
    return param && decodeURIComponent(param.split('=')[1])
}

function parseAddress(owner, network) {
    const bsvNetwork = network === 'main' ? 'mainnet' : 'testnet'
    try { return new bsv.Address(owner, bsvNetwork).toString() } catch (e) { } 
    try { return new bsv.PublicKey(owner, { network: bsvNetwork }).toAddress().toString() } catch (e) { } 
}

function parseQuery(value, network) {
    value = value.trim()

    if (value.length === 0) return {}

    const bsvNetwork = network === 'main' ? 'mainnet' : 'testnet'

    const parsePubkeyAddress = () => new bsv.PublicKey(value, { network: bsvNetwork }).toAddress().toString()
    try { return { address: parsePubkeyAddress() } } catch (e) { }

    const parseAddress = () => new bsv.Address(value, bsvNetwork).toString()
    try { return { address: parseAddress() } } catch (e) { }

    const locationRegex = /^[a-fA-F0-9]{64}_[od][0-9]+/
    if (locationRegex.test(value)) return { location: value }

    const txidRegex = /^[a-fA-F0-9]{64}$/
    if (txidRegex.test(value)) return { txid: value }

    return { error: "Sorry. We can't find this address or identifier." }
}

function camelCase(s) {
    const lowers = "abcdefghijklmnopqrstuvwxyz".split('');
    const firstLowerCase = s.split('').findIndex(x => lowers.includes(x))
    if (firstLowerCase === -1) return s.toLowerCase()
    return s.split('').slice(0, firstLowerCase).join('').toLowerCase() +
        s.split('').slice(firstLowerCase).join('')
} 

async function serialize(f) {
    let resolveF, rejectF
    const task = new Promise((resolve, reject) => { resolveF = resolve, rejectF = reject })
    const prev = this.tail
    this.tail = task
    try { await prev } catch (e) { }
    f().then(resolveF).catch(rejectF)
    return task
}
