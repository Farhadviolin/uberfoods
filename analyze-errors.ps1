$t=Get-Content .\artifacts\backend-build.log
$m=@{}
foreach($l in $t){
    if($l -match '^(.*\.ts)\((\d+),(\d+)\): error TS\d+:'){
        $f=$matches[1]
        if($m.ContainsKey($f)){
            $m[$f] = $m[$f] + 1
        } else {
            $m[$f] = 1
        }
    }
}
$m.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 15 | Format-Table -AutoSize
