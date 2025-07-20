// Mana symbol component using Mana font
const ManaSymbol = ({ symbol }: { symbol: string }) => {
  const getManaClass = (sym: string) => {
    const upper = sym.toUpperCase();
    
    // Handle specific mana symbols
    switch (upper) {
      case 'W': return 'ms ms-w ms-cost';
      case 'U': return 'ms ms-u ms-cost';
      case 'B': return 'ms ms-b ms-cost';
      case 'R': return 'ms ms-r ms-cost';
      case 'G': return 'ms ms-g ms-cost';
      case 'C': return 'ms ms-c ms-cost';
      case 'X': return 'ms ms-x ms-cost';
      case 'Y': return 'ms ms-y ms-cost';
      case 'Z': return 'ms ms-z ms-cost';
      // Handle hybrid mana
      case 'W/U': case 'WU': return 'ms ms-wu ms-cost';
      case 'W/B': case 'WB': return 'ms ms-wb ms-cost';
      case 'U/B': case 'UB': return 'ms ms-ub ms-cost';
      case 'U/R': case 'UR': return 'ms ms-ur ms-cost';
      case 'B/R': case 'BR': return 'ms ms-br ms-cost';
      case 'B/G': case 'BG': return 'ms ms-bg ms-cost';
      case 'R/G': case 'RG': return 'ms ms-rg ms-cost';
      case 'R/W': case 'RW': return 'ms ms-rw ms-cost';
      case 'G/W': case 'GW': return 'ms ms-gw ms-cost';
      case 'G/U': case 'GU': return 'ms ms-gu ms-cost';
      // Handle Phyrexian mana
      case 'W/P': case 'WP': return 'ms ms-wp ms-cost';
      case 'U/P': case 'UP': return 'ms ms-up ms-cost';
      case 'B/P': case 'BP': return 'ms ms-bp ms-cost';
      case 'R/P': case 'RP': return 'ms ms-rp ms-cost';
      case 'G/P': case 'GP': return 'ms ms-gp ms-cost';
      // Handle generic mana
      case '0': return 'ms ms-0 ms-cost';
      case '1': return 'ms ms-1 ms-cost';
      case '2': return 'ms ms-2 ms-cost';
      case '3': return 'ms ms-3 ms-cost';
      case '4': return 'ms ms-4 ms-cost';
      case '5': return 'ms ms-5 ms-cost';
      case '6': return 'ms ms-6 ms-cost';
      case '7': return 'ms ms-7 ms-cost';
      case '8': return 'ms ms-8 ms-cost';
      case '9': return 'ms ms-9 ms-cost';
      case '10': return 'ms ms-10 ms-cost';
      case '11': return 'ms ms-11 ms-cost';
      case '12': return 'ms ms-12 ms-cost';
      case '13': return 'ms ms-13 ms-cost';
      case '14': return 'ms ms-14 ms-cost';
      case '15': return 'ms ms-15 ms-cost';
      case '16': return 'ms ms-16 ms-cost';
      case '17': return 'ms ms-17 ms-cost';
      case '18': return 'ms ms-18 ms-cost';
      case '19': return 'ms ms-19 ms-cost';
      case '20': return 'ms ms-20 ms-cost';
      // Handle 2/color hybrid
      case '2/W': return 'ms ms-2w ms-cost';
      case '2/U': return 'ms ms-2u ms-cost';
      case '2/B': return 'ms ms-2b ms-cost';
      case '2/R': return 'ms ms-2r ms-cost';
      case '2/G': return 'ms ms-2g ms-cost';
      // Handle tap symbol
      case 'T': return 'ms ms-tap ms-cost';
      // Handle energy
      case 'E': return 'ms ms-e ms-cost';
      default:
        // For unknown symbols, try numeric
        if (/^\d+$/.test(sym)) {
          return `ms ms-${sym} ms-cost`;
        }
        // Fallback to generic colorless
        return 'ms ms-c ms-cost';
    }
  };

  return (
    <i 
      className={`${getManaClass(symbol)} inline-block text-base mx-0.5`}
      title={symbol}
    />
  );
};

// Parse mana cost string and render mana symbols
export const ManaDisplay = ({ manaString }: { manaString: string }) => {
  if (!manaString) return <span className="text-gray-500">—</span>;
  
  // Parse mana cost like "{2}{W}{U}" or color identity like "[\"W\",\"U\"]"
  let symbols: string[] = [];
  
  if (manaString.startsWith('[') && manaString.endsWith(']')) {
    // Color identity format: ["W","U"]
    try {
      symbols = JSON.parse(manaString);
    } catch {
      symbols = [];
    }
  } else if (manaString.includes('{')) {
    // Mana cost format: {2}{W}{U}
    symbols = manaString.match(/\{([^}]+)\}/g)?.map(match => match.slice(1, -1)) || [];
  } else {
    // Simple format: "WU"
    symbols = manaString.split('');
  }
  
  if (symbols.length === 0) {
    return <span className="text-gray-500">—</span>;
  }
  
  return (
    <div className="flex items-center flex-wrap">
      {symbols.map((symbol, index) => (
        <ManaSymbol key={index} symbol={symbol} />
      ))}
    </div>
  );
};