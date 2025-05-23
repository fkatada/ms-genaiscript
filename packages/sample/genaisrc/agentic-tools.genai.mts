import { calculator } from "@agentic/calculator"
import { WeatherClient } from "@agentic/weather"

const { question, city } = env.vars
script({
    model: "small",
    parameters: {
        question: {
            type: "string",
            default: "How much is 11 + 4? then divide by 3?",
        },
        city: {
            type: "string",
            default: "Paris",
        },
    },
    /*tests: {
        description: "Testing the default prompt",
        keywords: "5",
    },*/
})

defTool(calculator as any)

const weather = new WeatherClient()
const res = await weather.getCurrentWeather({ q: city })
console.log(`weather: ${YAML.stringify(res)}`)
defTool(weather as any)

$`Answer the following arithmetic question:

    ${question}

Get the weather in ${city}.
`
