import { useFlag } from '../flags/useFlag'
import { Region } from './Region'

export function Footer() {
  const snowflake = useFlag('req-45')
  return (
    <Region id="footer" as="footer" className="footer">
      {snowflake ? '❄️ Built by Jahnel Group' : 'Built by Jahnel Group'}
    </Region>
  )
}
