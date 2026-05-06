import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Receipt, TrendingUp, Wallet, Type, Ruler } from 'lucide-react';
import { numberToNepaliEnglishWords, toDevanagari, hillToSqft, sqftToHill, teraiToSqft, sqftToTerai, SQFT_TO_SQM } from '@/lib/nepaliUtils';
import { useAuth } from '@/context/AuthContext';
import PaywallGate from '@/components/PaywallGate';
import { canAccessTaxTools } from '@/lib/subscriptionAccess';

const formatNPR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(n);

const Tools = () => {
  const { user } = useAuth();
  // Income tax calculator (simplified Nepal individual slabs FY 2080/81)
  const [income, setIncome] = useState('');
  const [status, setStatus] = useState<'individual' | 'couple'>('individual');
  const [tax, setTax] = useState<number | null>(null);

  const calcIncomeTax = () => {
    const inc = parseFloat(income) || 0;
    const slabs = status === 'individual'
      ? [[500000, 0.01], [200000, 0.10], [300000, 0.20], [1000000, 0.30], [Infinity, 0.36]]
      : [[600000, 0.01], [200000, 0.10], [300000, 0.20], [900000, 0.30], [Infinity, 0.36]];
    let remaining = inc;
    let total = 0;
    for (const [limit, rate] of slabs as [number, number][]) {
      const slice = Math.min(remaining, limit);
      total += slice * rate;
      remaining -= slice;
      if (remaining <= 0) break;
    }
    setTax(total);
  };

  // VAT
  const [vatAmount, setVatAmount] = useState('');
  const [vatMode, setVatMode] = useState<'add' | 'extract'>('add');
  const [vatResult, setVatResult] = useState<{ base: number; vat: number; total: number } | null>(null);

  const calcVAT = () => {
    const a = parseFloat(vatAmount) || 0;
    if (vatMode === 'add') {
      setVatResult({ base: a, vat: a * 0.13, total: a * 1.13 });
    } else {
      const base = a / 1.13;
      setVatResult({ base, vat: a - base, total: a });
    }
  };

  // TDS
  const [tdsAmount, setTdsAmount] = useState('');
  const [tdsRate, setTdsRate] = useState('15');
  const [tdsResult, setTdsResult] = useState<number | null>(null);

  const calcTDS = () => {
    const a = parseFloat(tdsAmount) || 0;
    const r = parseFloat(tdsRate) || 0;
    setTdsResult(a * (r / 100));
  };

  // Nepali Number to Text
  const [numInput, setNumInput] = useState('');
  const numEnglishWords = numInput ? numberToNepaliEnglishWords(parseFloat(numInput)) : '';
  const numDevanagari = numInput ? toDevanagari(numInput) : '';

  // Land converter
  const [landMode, setLandMode] = useState<'hill' | 'terai'>('hill');
  const [hill, setHill] = useState({ ropani: '', aana: '', paisa: '', daam: '' });
  const [terai, setTerai] = useState({ bigha: '', kattha: '', dhur: '' });

  const hillSqft = hillToSqft(+hill.ropani || 0, +hill.aana || 0, +hill.paisa || 0, +hill.daam || 0);
  const teraiSqft = teraiToSqft(+terai.bigha || 0, +terai.kattha || 0, +terai.dhur || 0);
  const totalSqft = landMode === 'hill' ? hillSqft : teraiSqft;
  const otherSystem = landMode === 'hill' ? sqftToTerai(totalSqft) : sqftToHill(totalSqft);

  const toolsUnlocked = canAccessTaxTools(user);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-primary-onBg mb-3">Tools & Calculators</h1>
            <p className="text-muted-foreground">
              Quick utilities for common Nepalese tax computations.
            </p>
          </div>

          <PaywallGate
            unlocked={toolsUnlocked}
            contentType="Calculator"
            previewHeight={340}
          >
            <Tabs defaultValue="income" className="w-full">
            <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full max-w-3xl mx-auto mb-8">
              <TabsTrigger value="income"><Calculator className="h-4 w-4 mr-2" />Income Tax</TabsTrigger>
              <TabsTrigger value="vat"><Receipt className="h-4 w-4 mr-2" />VAT</TabsTrigger>
              <TabsTrigger value="tds"><TrendingUp className="h-4 w-4 mr-2" />TDS</TabsTrigger>
              <TabsTrigger value="numtotext"><Type className="h-4 w-4 mr-2" />Num→Text</TabsTrigger>
              <TabsTrigger value="land"><Ruler className="h-4 w-4 mr-2" />Land</TabsTrigger>
            </TabsList>

            <TabsContent value="income">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary-onBg" /> Income Tax Calculator</CardTitle>
                  <CardDescription>Estimate annual income tax for Nepal (FY 2080/81 simplified slabs).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Filing Status</Label>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant={status === 'individual' ? 'default' : 'outline'} onClick={() => setStatus('individual')}>Individual</Button>
                      <Button size="sm" variant={status === 'couple' ? 'default' : 'outline'} onClick={() => setStatus('couple')}>Married Couple</Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="income">Annual Taxable Income (NPR)</Label>
                    <Input id="income" type="number" placeholder="e.g. 1200000" value={income} onChange={(e) => setIncome(e.target.value)} />
                  </div>
                  <Button onClick={calcIncomeTax} className="w-full">Calculate Tax</Button>
                  {tax !== null && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
                      <div className="text-sm text-muted-foreground">Estimated Annual Tax</div>
                      <div className="text-3xl font-bold text-primary-onBg">{formatNPR(tax)}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vat">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary-onBg" /> VAT Calculator</CardTitle>
                  <CardDescription>Calculate 13% VAT — Exclusive (add 13% on top) or Inclusive (extract 13% from total).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button size="sm" variant={vatMode === 'add' ? 'default' : 'outline'} onClick={() => setVatMode('add')}>Exclusive (Add 13%)</Button>
                    <Button size="sm" variant={vatMode === 'extract' ? 'default' : 'outline'} onClick={() => setVatMode('extract')}>Inclusive (Extract 13%)</Button>
                  </div>
                  <div>
                    <Label htmlFor="vat">Amount (NPR)</Label>
                    <Input id="vat" type="number" value={vatAmount} onChange={(e) => setVatAmount(e.target.value)} />
                  </div>
                  <Button onClick={calcVAT} className="w-full">Calculate</Button>
                  {vatResult && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
                      <div><div className="text-xs text-muted-foreground">Base</div><div className="font-bold">{formatNPR(vatResult.base)}</div></div>
                      <div><div className="text-xs text-muted-foreground">VAT (13%)</div><div className="font-bold text-primary-onBg">{formatNPR(vatResult.vat)}</div></div>
                      <div><div className="text-xs text-muted-foreground">Total</div><div className="font-bold">{formatNPR(vatResult.total)}</div></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tds">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary-onBg" /> TDS Calculator</CardTitle>
                  <CardDescription>Compute tax deducted at source for any rate.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="tdsAmt">Payment Amount (NPR)</Label>
                    <Input id="tdsAmt" type="number" value={tdsAmount} onChange={(e) => setTdsAmount(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="tdsRate">TDS Rate (%)</Label>
                    <Input id="tdsRate" type="number" value={tdsRate} onChange={(e) => setTdsRate(e.target.value)} />
                  </div>
                  <Button onClick={calcTDS} className="w-full">Calculate TDS</Button>
                  {tdsResult !== null && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">TDS Amount</div>
                      <div className="text-3xl font-bold text-primary-onBg">{formatNPR(tdsResult)}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="numtotext">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Type className="h-5 w-5 text-primary-onBg" /> Nepali Number to Text Converter</CardTitle>
                  <CardDescription>Convert any number to Nepali/Indian system words (Lakh, Crore, Arab) and Devanagari digits.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="numinput">Enter number</Label>
                    <Input id="numinput" type="number" placeholder="e.g. 125000" value={numInput} onChange={(e) => setNumInput(e.target.value)} />
                  </div>
                  {numInput && (
                    <div className="space-y-3">
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <div className="text-xs text-muted-foreground mb-1">In words (English, Nepali system)</div>
                        <div className="text-lg font-semibold text-primary-onBg">{numEnglishWords} {parseFloat(numInput) >= 1 && !numEnglishWords.includes('Paisa') ? 'Rupees Only' : ''}</div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="text-xs text-amber-900 mb-1">In Devanagari digits</div>
                        <div className="text-2xl font-bold text-amber-900">{numDevanagari}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="land">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Ruler className="h-5 w-5 text-primary-onBg" /> Nepali Land Measurement Converter</CardTitle>
                  <CardDescription>Convert between Hill (Ropani/Aana/Paisa/Daam), Terai (Bigha/Kattha/Dhur), sq.ft and sq.m.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button size="sm" variant={landMode === 'hill' ? 'default' : 'outline'} onClick={() => setLandMode('hill')}>Hill (Ropani)</Button>
                    <Button size="sm" variant={landMode === 'terai' ? 'default' : 'outline'} onClick={() => setLandMode('terai')}>Terai (Bigha)</Button>
                  </div>

                  {landMode === 'hill' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div><Label>Ropani</Label><Input type="number" value={hill.ropani} onChange={(e) => setHill({ ...hill, ropani: e.target.value })} /></div>
                      <div><Label>Aana</Label><Input type="number" value={hill.aana} onChange={(e) => setHill({ ...hill, aana: e.target.value })} /></div>
                      <div><Label>Paisa</Label><Input type="number" value={hill.paisa} onChange={(e) => setHill({ ...hill, paisa: e.target.value })} /></div>
                      <div><Label>Daam</Label><Input type="number" value={hill.daam} onChange={(e) => setHill({ ...hill, daam: e.target.value })} /></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Bigha</Label><Input type="number" value={terai.bigha} onChange={(e) => setTerai({ ...terai, bigha: e.target.value })} /></div>
                      <div><Label>Kattha</Label><Input type="number" value={terai.kattha} onChange={(e) => setTerai({ ...terai, kattha: e.target.value })} /></div>
                      <div><Label>Dhur</Label><Input type="number" value={terai.dhur} onChange={(e) => setTerai({ ...terai, dhur: e.target.value })} /></div>
                    </div>
                  )}

                  {totalSqft > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Square feet</div>
                          <div className="text-xl font-bold text-primary-onBg">{totalSqft.toLocaleString(undefined, { maximumFractionDigits: 2 })} sq.ft</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Square meters</div>
                          <div className="text-xl font-bold text-primary-onBg">{(totalSqft * SQFT_TO_SQM).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq.m</div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-primary/10">
                        <div className="text-xs text-muted-foreground mb-1">Equivalent in {landMode === 'hill' ? 'Terai system' : 'Hill system'}</div>
                        {landMode === 'hill' ? (
                          <div className="font-medium">{(otherSystem as any).bigha} Bigha · {(otherSystem as any).kattha} Kattha · {(otherSystem as any).dhur} Dhur</div>
                        ) : (
                          <div className="font-medium">{(otherSystem as any).ropani} Ropani · {(otherSystem as any).aana} Aana · {(otherSystem as any).paisa} Paisa · {(otherSystem as any).daam} Daam</div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          </PaywallGate>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Tools;
