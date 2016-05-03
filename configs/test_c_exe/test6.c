#include <stdio.h>
#include <stdlib.h>

/* run this program using the console pauser or add your own getch, system("pause") or input loop */

int main(int argc, char *argv[]) {
	printf("Starting...\n");
	//printf("{\"Argv_0\" : \"%s\"}\n",argv[0]);
	fflush(stdout);
	if(argv[1]){
		printf("{\"Argv_1\" : \"%s\"}\n",argv[1]);
		fflush(stdout);
		if(argv[2]){
			printf("{\"Argv_2\" : \"%s\"}\n",argv[2]);
			fflush(stdout);
		}
	}
	char str[10];

	while(1){
		scanf("%s",&str);
		printf("{\"returns\" : \"%s\"}\n",str);
		fflush(stdout);//must flush stdout or return will be buffered
	}

	return 0;
}
