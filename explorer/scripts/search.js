
searchButton.onclick = () => {
    document.body.style.overflow = 'hidden'
    searchContainer.classList.add('open')
    setTimeout(() => input.focus(), 100)
}

closeButton.onclick = () => {
    searchContainer.classList.remove('open')
    document.body.style.overflow = 'visible'
}
