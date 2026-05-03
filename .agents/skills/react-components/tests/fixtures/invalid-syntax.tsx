// Intentionally invalid TypeScript to test parse error handling
interface BrokenProps {
  readonly label: string

export const BrokenComponent = ({ label }: BrokenProps) => {
  return <div>{label</div>
};