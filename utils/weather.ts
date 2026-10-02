import type { WorldWeather } from '../types/virtualProfile'

export function weatherVisual(code: string, isDay: boolean) {
  const value = Number(code)
  if ([100, 150].includes(value)) return { asset: isDay ? 'clear-day' : 'clear-night', motion: isDay ? 'sun' : 'float' }
  if ([101, 102, 103, 151, 152, 153].includes(value)) return { asset: isDay ? 'partly-cloudy-day' : 'partly-cloudy-night', motion: 'float' }
  if (value === 104 || value === 154) return { asset: 'overcast', motion: 'float' }
  if ([302, 303, 304].includes(value)) return { asset: 'thunderstorms', motion: 'storm' }
  if ([313, 404, 405, 406].includes(value)) return { asset: 'sleet', motion: 'snow' }
  if (value >= 300 && value < 400) return { asset: 'rain', motion: 'rain' }
  if (value >= 400 && value < 500) return { asset: 'snow', motion: 'snow' }
  if ([503, 504, 507, 508].includes(value)) return { asset: 'dust', motion: 'float' }
  if (value >= 500 && value < 600) return { asset: 'fog', motion: 'float' }
  if (value >= 200 && value < 300) return { asset: 'wind', motion: 'float' }
  return { asset: 'not-available', motion: 'none' }
}

export function weatherTemperature(weather: WorldWeather) {
  const degree = (value: number) => `${Math.round(value)}°`
  if (weather.period === 'hourly' && Number.isFinite(weather.temperature)) return degree(weather.temperature!)
  if (Number.isFinite(weather.temperatureMin) && Number.isFinite(weather.temperatureMax)) {
    return `${degree(weather.temperatureMin!)} / ${degree(weather.temperatureMax!)}`
  }
  return ''
}
