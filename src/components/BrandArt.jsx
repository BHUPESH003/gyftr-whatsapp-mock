/** Brand photo if we have one, otherwise the logo on the brand's tint. */
export default function BrandArt({ brand, className, logo }) {
  const photo = !logo && brand.hero;
  return (
    <div className={`${className} brandart ${photo ? 'photo' : ''}`} style={{ background: photo ? '#fff' : brand.tint }}>
      <img src={photo || brand.logo} alt={brand.name} loading="lazy" />
    </div>
  );
}
