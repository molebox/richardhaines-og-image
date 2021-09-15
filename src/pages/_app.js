import "@fontsource/inconsolata/300.css"
import "@fontsource/inconsolata/400.css"
import "@fontsource/inconsolata/700.css"
import { ChakraProvider } from "@chakra-ui/react"
import { theme } from '../theme'
import Fonts from "../components/fonts"

function MyApp({ Component, pageProps }) {
  return (
      <ChakraProvider theme={theme}>
        <Fonts />
          <Component {...pageProps} />
      </ChakraProvider>
  )
}

export default MyApp